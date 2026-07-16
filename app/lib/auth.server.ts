import { getAdminAuth } from '~/services/firebase-admin.server';

export async function getUserScope(request: Request): Promise<{
  userId: string;
  scope: { type: 'PERSONAL'; userId: string } | { type: 'ACCOUNT'; accountId: string; accountName: string; role: string };
  context: 'PERSONAL' | 'BUSINESS';
}> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }

  const token = authHeader.slice(7);
  const adminAuth = getAdminAuth();
  const decoded = await adminAuth.verifyIdToken(token);
  const userId = decoded.uid;

  const activeScopeHeader = request.headers.get('X-Active-Scope');
  let scope: { type: 'PERSONAL'; userId: string } | { type: 'ACCOUNT'; accountId: string; accountName: string; role: string };
  let context: 'PERSONAL' | 'BUSINESS' = 'PERSONAL';

  if (activeScopeHeader) {
    try {
      scope = JSON.parse(activeScopeHeader);
      context = scope.type === 'PERSONAL' ? 'PERSONAL' : 'BUSINESS';
    } catch {
      scope = { type: 'PERSONAL', userId };
    }
  } else {
    scope = { type: 'PERSONAL', userId };
  }

  return { userId, scope, context };
}