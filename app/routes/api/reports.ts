import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/api-helpers.server";
import { getAdminFirestore } from "~/services/firebase-admin.server";
import { escapeHtml, sendEmail } from "~/services/email.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const authUser = await requireAuth(request);
  const db = getAdminFirestore();
  const snap = await db.collection("reports").where("reporterId", "==", authUser.uid).orderBy("createdAt", "desc").get();
  return Response.json({ success: true, data: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
}

export async function action({ request }: ActionFunctionArgs) {
  const authUser = await requireAuth(request);
  const body = await request.json();
  const db = getAdminFirestore();

  const ref = await db.collection("reports").add({
    type: body.type || "bug",
    title: body.title || "",
    description: body.description || "",
    severity: body.type === "bug" ? (body.severity || "medium") : null,
    screenshot: body.screenshot || null,
    module: body.module || null,
    reporterId: authUser.uid,
    reporterEmail: authUser.email,
    reporterName: authUser.displayName || authUser.email,
    status: "open",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const superadminEmail = process.env.SUPERADMIN_EMAIL;
  if (superadminEmail) {
    sendEmail(
      [superadminEmail],
      `Novo Report: ${escapeHtml(body.title || "Sem título")}`,
      `<p><strong>Tipo:</strong> ${escapeHtml(body.type || "bug")}</p><p><strong>Título:</strong> ${escapeHtml(body.title || "")}</p><p>${escapeHtml(body.description || "")}</p><p>Por: ${authUser.email}</p>`,
    ).catch(() => {});
  }

  return Response.json({ success: true, data: { id: ref.id } }, { status: 201 });
}
