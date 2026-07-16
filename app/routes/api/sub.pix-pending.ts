import type { LoaderFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/api-helpers.server";
import { getSubscriptionByEmail } from "~/services/subscription-store.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const authUser = await requireAuth(request);
  const userEmail = authUser.email.trim().toLowerCase();
  const sub = await getSubscriptionByEmail(userEmail);
  return Response.json({ success: true, data: sub?.pendingPix || null });
}
