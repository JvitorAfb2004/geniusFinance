import { FirebaseError } from 'firebase/app';

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  } | null;
}

export function handleFirestoreError(
  error: unknown,
  operationType: FirestoreErrorInfo['operationType'],
  path: string | null,
  authUser: import('firebase/auth').User | null
) {
  if (error instanceof FirebaseError && error.message.includes('Missing or insufficient permissions')) {
    const errorInfo: FirestoreErrorInfo = {
      error: error.message,
      operationType,
      path,
      authInfo: authUser ? {
        userId: authUser.uid,
        email: authUser.email || '',
        emailVerified: authUser.emailVerified,
        isAnonymous: authUser.isAnonymous,
        providerInfo: authUser.providerData.map(p => ({
          providerId: p.providerId,
          displayName: p.displayName || '',
          email: p.email || ''
        }))
      } : null
    };
    
    console.error("Firestore Error (JSON):", JSON.stringify(errorInfo, null, 2));
    
    // As per instruction, we must throw the stringified errorInfo
    throw new Error(JSON.stringify(errorInfo));
  }
  
  if (error instanceof Error && error.message.includes('the client is offline')) {
    console.error("Please check your Firebase configuration.");
  }

  throw error;
}
