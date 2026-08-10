import type { ActionFunctionArgs } from "react-router";
import { getAdminFirestore } from "~/services/firebase-admin.server";
import { markWebhookEventProcessed } from "~/services/subscription-store.server";
import { pluggyTxToProvision, type PluggyTransaction } from "~/lib/pluggyMapping";
import { getApiKey, fetchTransactionsByLink, fetchTransactionsByIds } from "~/services/pluggy.server";
import {
  getConnectionByItemId,
  upsertProvision,
  getProvisionsByTransactionIds,
  updateProvision,
  deleteProvision,
  markConnectionDeleted,
} from "~/services/pluggy-store.server";

const PLUGGY_WEBHOOK_SECRET = process.env.PLUGGY_WEBHOOK_SECRET || "";

async function handleEvent(eventName: string, event: Record<string, unknown>) {
  const itemId = String(event.itemId || "");
  const accountId = String(event.accountId || "");

  if (eventName === "item/deleted") {
    const conn = await getConnectionByItemId(itemId);
    if (conn) await markConnectionDeleted(String(conn.id));
    return;
  }
  if (eventName === "item/created" || eventName === "item/updated" || eventName === "item/login_succeeded" || eventName === "item/error") {
    // estados de item nao geram provisoes; auto-sync dispara transactions/created depois
    return;
  }

  if (eventName === "transactions/created") {
    const conn = await getConnectionByItemId(itemId);
    if (!conn) return; // conexao ainda nao gravada; proxima sync cobre
    const link = String(event.createdTransactionsLinkV2 || event.createdTransactionsLink || "");
    if (!link) return;
    const apiKey = await getApiKey();
    const txs = (await fetchTransactionsByLink(link, apiKey)) as PluggyTransaction[];
    for (const tx of txs) {
      await upsertProvision({
        userId: conn.userId,
        scopeType: conn.scopeType,
        scopeId: conn.scopeId ?? null,
        provisionStatus: "PROVISION",
        convertedToTransactionId: null,
        ...pluggyTxToProvision(tx, itemId, accountId),
      });
    }
    return;
  }

  if (eventName === "transactions/updated") {
    const conn = await getConnectionByItemId(itemId);
    if (!conn) return;
    const ids = Array.isArray(event.transactionIds) ? event.transactionIds.map(String) : [];
    if (!ids.length || !accountId) return;
    const apiKey = await getApiKey();
    const txs = (await fetchTransactionsByIds(accountId, ids, apiKey)) as PluggyTransaction[];
    const existing = await getProvisionsByTransactionIds(ids);
    const byId = new Map(existing.map((p) => [String(p.pluggyTransactionId), p]));
    for (const tx of txs) {
      const mapped = pluggyTxToProvision(tx, itemId, accountId);
      const doc = byId.get(tx.id);
      if (!doc) {
        await upsertProvision({
          userId: conn.userId,
          scopeType: conn.scopeType,
          scopeId: conn.scopeId ?? null,
          provisionStatus: "PROVISION",
          convertedToTransactionId: null,
          ...mapped,
        });
        continue;
      }
      if (doc.provisionStatus === "CONVERTED" && doc.convertedToTransactionId) {
        // provisao ja convertida: propaga amount/date para a transaction linkada
        const db = getAdminFirestore();
        const targetPath = conn.scopeType === "ACCOUNT"
          ? `accounts/${conn.scopeId}/transactions/${doc.convertedToTransactionId}`
          : `users/${conn.userId}/transactions/${doc.convertedToTransactionId}`;
        await db.doc(targetPath).update({ amount: mapped.amount, date: mapped.date, updatedAt: new Date().toISOString() });
      } else {
        await updateProvision(String(doc.id), {
          amount: mapped.amount,
          date: mapped.date,
          description: mapped.description,
          status: mapped.status,
        });
      }
    }
    return;
  }

  if (eventName === "transactions/deleted") {
    const ids = Array.isArray(event.transactionIds) ? event.transactionIds.map(String) : [];
    const existing = await getProvisionsByTransactionIds(ids);
    for (const doc of existing) {
      if (doc.provisionStatus === "PROVISION") {
        await deleteProvision(String(doc.id));
      } else {
        await updateProvision(String(doc.id), { provisionStatus: "IGNORED" });
      }
    }
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const url = new URL(request.url);
  if (PLUGGY_WEBHOOK_SECRET && url.searchParams.get("secret") !== PLUGGY_WEBHOOK_SECRET) {
    return Response.json({ error: "secret invalido" }, { status: 401 });
  }

  const event = await request.json().catch(() => null);
  if (!event || !event.eventId || !event.event) {
    return Response.json({ error: "payload invalido" }, { status: 400 });
  }

  const isNew = await markWebhookEventProcessed(String(event.eventId));
  if (!isNew) return Response.json({ success: true, deduplicated: true });

  try {
    await handleEvent(String(event.event), event);
  } catch (e) {
    // ponytail: sem retry aqui; Pluggy reenvia ate 9x e dedupe previne duplicatas
    console.error("[webhook/pluggy]", (e as Error).message);
  }
  return Response.json({ success: true });
}
