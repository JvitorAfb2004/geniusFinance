import type { ActionFunctionArgs } from "react-router";
import { sendWelcomeEmail } from "~/services/email.server";

export async function action({ request }: ActionFunctionArgs) {
  const body = await request.json();
  const email = (body.email || "").trim();
  if (!email) {
    return Response.json({ error: "email obrigatorio" }, { status: 400 });
  }
  const result = await sendWelcomeEmail(email, (body.displayName || "").trim());
  return Response.json(result, { status: result.skipped ? 202 : 200 });
}
