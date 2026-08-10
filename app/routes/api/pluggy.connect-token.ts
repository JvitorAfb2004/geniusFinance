import type { ActionFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/api-helpers.server";
import { createConnectToken } from "~/services/pluggy.server";

export async function action({ request }: ActionFunctionArgs) {
  const authUser = await requireAuth(request);
  const connectToken = await createConnectToken(authUser.uid);
  return Response.json({ success: true, data: { connectToken } });
}
