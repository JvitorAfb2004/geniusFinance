import type { ActionFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/api-helpers.server";
import { sendWelcomeEmail } from "~/services/email.server";

export async function action({ request }: ActionFunctionArgs) {
  const authUser = await requireAuth(request);
  const body = await request.json();
  const email = (body.email || authUser.email || "").trim();
  if (!email) {
    return Response.json({ error: "email obrigatorio" }, { status: 400 });
  }
  if (email.toLowerCase() !== authUser.email.toLowerCase()) {
    return Response.json({ error: "email nao corresponde ao usuario autenticado" }, { status: 403 });
  }
  const result = await sendWelcomeEmail(email, (body.displayName || authUser.displayName || "").trim());
  return Response.json(result, { status: result.skipped ? 202 : 200 });
}
