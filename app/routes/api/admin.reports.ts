import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { requireAuth, isSuperadmin } from "~/lib/api-helpers.server";
import { getAdminFirestore } from "~/services/firebase-admin.server";
import { escapeHtml, sendEmail } from "~/services/email.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const u = await requireAuth(request);
  if (!isSuperadmin(u)) {
    return Response.json({ error: "restrito" }, { status: 403 });
  }
  const db = getAdminFirestore();
  const snap = await db.collection("reports").orderBy("createdAt", "desc").get();
  return Response.json({ success: true, data: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
}

export async function action({ request }: ActionFunctionArgs) {
  const u = await requireAuth(request);
  if (!isSuperadmin(u)) {
    return Response.json({ error: "restrito" }, { status: 403 });
  }

  if (request.method === "PUT") {
    const body = await request.json();
    const reportId = body.id;
    if (!reportId) return Response.json({ error: "id obrigatorio" }, { status: 400 });
    const db = getAdminFirestore();
    const update: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (body.status) update.status = body.status;
    if (body.adminNotes !== undefined) update.adminNotes = body.adminNotes;
    await db.collection("reports").doc(reportId).update(update);

    if (body.status) {
      const snap = await db.collection("reports").doc(reportId).get();
      if (snap.exists) {
        const report = snap.data()!;
        sendEmail(
          [report.reporterEmail as string],
          `Report atualizado: ${escapeHtml(body.status)}`,
          `<p>Seu report <strong>"${escapeHtml((report.title as string) || "")}"</strong> foi atualizado para: <strong>${escapeHtml(body.status)}</strong></p>`,
        ).catch(() => {});
      }
    }
    return Response.json({ success: true });
  }

  return Response.json({ error: "metodo nao suportado" }, { status: 405 });
}
