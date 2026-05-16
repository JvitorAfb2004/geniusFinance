import type { LoaderFunctionArgs } from "react-router";
import { requireAuth, serializeFirestoreDoc } from "~/lib/api-helpers.server";
import { getSubscriptionByEmail } from "~/services/subscription-store.server";
import { getAdminFirestore } from "~/services/firebase-admin.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const authUser = await requireAuth(request);
  const userEmail = authUser.email.trim().toLowerCase();
  const sub = await getSubscriptionByEmail(userEmail);

  let trial = null;
  try {
    const db = getAdminFirestore();
    const trialDoc = await db.collection("trials").doc(authUser.uid).get();
    if (trialDoc.exists) {
      const data = trialDoc.data();
      if (data) trial = { id: trialDoc.id, ...serializeFirestoreDoc(data) };
    }
  } catch { /* ignore */ }

  return Response.json({ success: true, data: { subscription: sub, trial } });
}
