import { db } from './firebase';
import { User } from 'firebase/auth';
import {
  collection, doc, writeBatch, serverTimestamp,
  getDoc, getDocs, query, where, orderBy, limit, collectionGroup,
} from 'firebase/firestore';
import type { Account, AccountMember, AccountInvite, AccountRole } from '../types';
import type { FinanceCollectionName } from './pathAdapter';

const MIGRATABLE_COLLECTIONS: FinanceCollectionName[] = [
  'transactions', 'categories', 'budgets', 'sales-targets',
  'tags', 'goals', 'leads', 'lead-options', 'service-types', 'projects',
];

export interface MigrationProgress {
  collection: string;
  migrated: number;
  skipped: number;
  errors: number;
}

export async function migrateUserToAccount(
  userId: string,
  accountId: string,
  onProgress?: (progress: MigrationProgress) => void
): Promise<MigrationProgress[]> {
  const results: MigrationProgress[] = [];

  for (const colName of MIGRATABLE_COLLECTIONS) {
    const progress: MigrationProgress = { collection: colName, migrated: 0, skipped: 0, errors: 0 };

    try {
      const srcQuery = query(
        collection(db, `users/${userId}/${colName}`),
        where('context', '==', 'BUSINESS')
      );
      const srcSnap = await getDocs(srcQuery);

      if (srcSnap.empty) {
        results.push(progress);
        onProgress?.(progress);
        continue;
      }

      const destCol = collection(db, `accounts/${accountId}/${colName}`);

      // Check existing destination docs for idempotency
      const destSnap = await getDocs(query(destCol));
      const existingIds = new Set(destSnap.docs.map((d) => d.id));

      let batch = writeBatch(db);
      let batchCount = 0;

      for (const srcDoc of srcSnap.docs) {
        if (existingIds.has(srcDoc.id)) {
          progress.skipped++;
          continue;
        }

        const data = { ...srcDoc.data() };
        // Remove Firestore timestamp fields — they'll be re-created
        delete (data as Record<string, unknown>).createdAt;
        delete (data as Record<string, unknown>).updatedAt;

        const destRef = doc(destCol, srcDoc.id);
        batch.set(destRef, {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        batchCount++;
        progress.migrated++;

        if (batchCount >= 400) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      }

      if (batchCount > 0) {
        await batch.commit();
      }
    } catch (err) {
      progress.errors++;
      console.error(`Migration error for ${colName}:`, err);
    }

    results.push(progress);
    onProgress?.(progress);
  }

  return results;
}

export async function createAccount(user: User, name: string): Promise<string> {
  const batch = writeBatch(db);

  const accountRef = doc(collection(db, 'accounts'));
  const accountId = accountRef.id;

  batch.set(accountRef, {
    name,
    ownerId: user.uid,
    status: 'ACTIVE',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const memberRef = doc(db, `accounts/${accountId}/members`, user.uid);
  batch.set(memberRef, {
    uid: user.uid,
    email: user.email || '',
    role: 'owner' as AccountRole,
    invitedBy: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Index: user -> accounts membership (avoids collectionGroup queries)
  const membershipRef = doc(db, `user-accounts/${user.uid}/memberships`, accountId);
  batch.set(membershipRef, {
    accountId,
    accountName: name,
    role: 'owner' as AccountRole,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
  return accountId;
}

export async function getUserAccounts(
  userId: string
): Promise<{ account: Account; role: AccountRole }[]> {
  const membershipSnap = await getDocs(
    query(collection(db, `user-accounts/${userId}/memberships`))
  );

  const results: { account: Account; role: AccountRole }[] = [];

  for (const mDoc of membershipSnap.docs) {
    const mData = mDoc.data();
    const accountId = mData.accountId;

    try {
      const accountSnap = await getDoc(doc(db, 'accounts', accountId));
      if (!accountSnap.exists()) continue;

      const data = accountSnap.data();
      if (data.status !== 'ACTIVE') continue;

      results.push({
        account: {
          id: accountSnap.id,
          name: data.name,
          ownerId: data.ownerId,
          status: data.status,
          createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
        },
        role: mData.role as AccountRole,
      });
    } catch {
      // Skip accounts that can't be read (shouldn't happen with proper index)
    }
  }

  return results;
}

export async function getAccountMembers(accountId: string): Promise<AccountMember[]> {
  const snap = await getDocs(
    query(collection(db, `accounts/${accountId}/members`), orderBy('createdAt', 'asc'))
  );

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      uid: data.uid,
      email: data.email,
      role: data.role as AccountRole,
      invitedBy: data.invitedBy,
      createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate?.().toISOString() || new Date().toISOString(),
    } as AccountMember;
  });
}

export async function createInvite(
  accountId: string,
  email: string,
  role: Exclude<AccountRole, 'owner'>,
  createdBy: string,
  accountName: string
): Promise<string> {
  const batch = writeBatch(db);
  const inviteRef = doc(collection(db, `accounts/${accountId}/invites`));
  const normalizedEmail = email.toLowerCase().trim();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const inviteData = {
    accountId,
    email: normalizedEmail,
    role,
    status: 'PENDING',
    createdBy,
    expiresAt,
    createdAt: serverTimestamp(),
  };

  batch.set(inviteRef, inviteData);

  // Index: allows invitee to find their pending invites by email
  const userInviteRef = doc(db, `user-invites/${normalizedEmail}/pending`, inviteRef.id);
  batch.set(userInviteRef, {
    ...inviteData,
    accountName,
  });

  await batch.commit();
  return inviteRef.id;
}

export async function getPendingInvites(email: string): Promise<AccountInvite[]> {
  const normalizedEmail = email.toLowerCase().trim();
  const snap = await getDocs(
    query(collection(db, `user-invites/${normalizedEmail}/pending`), where('status', '==', 'PENDING'))
  );

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      accountId: data.accountId,
      email: data.email,
      role: data.role,
      status: data.status,
      createdBy: data.createdBy,
      expiresAt: data.expiresAt,
      createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
    } as AccountInvite;
  });
}

export async function acceptInvite(
  inviteId: string,
  accountId: string,
  user: User
): Promise<void> {
  const batch = writeBatch(db);
  const normalizedEmail = user.email?.toLowerCase().trim() || '';

  // 1. Update invite status in account
  const accountInviteRef = doc(db, `accounts/${accountId}/invites`, inviteId);
  batch.update(accountInviteRef, { status: 'ACCEPTED' });

  // 2. Update user-invites index
  const userInviteRef = doc(db, `user-invites/${normalizedEmail}/pending`, inviteId);
  batch.update(userInviteRef, { status: 'ACCEPTED' });

  // 3. Create member document — invitedBy stores inviteId for rule verification
  const memberRef = doc(db, `accounts/${accountId}/members`, user.uid);
  batch.set(memberRef, {
    uid: user.uid,
    email: normalizedEmail,
    role: 'member' as AccountRole,
    invitedBy: inviteId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 4. Create user-accounts membership index
  const membershipRef = doc(db, `user-accounts/${user.uid}/memberships`, accountId);

  // Get account name
  const accountSnap = await getDoc(doc(db, 'accounts', accountId));
  const accountName = accountSnap.exists() ? accountSnap.data().name : 'Conta';

  batch.set(membershipRef, {
    accountId,
    accountName,
    role: 'member' as AccountRole,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
}

export async function getAccountInvites(accountId: string): Promise<AccountInvite[]> {
  const snap = await getDocs(
    query(collection(db, `accounts/${accountId}/invites`), where('status', '==', 'PENDING'))
  );

  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      accountId: data.accountId,
      email: data.email,
      role: data.role,
      status: data.status,
      createdBy: data.createdBy,
      expiresAt: data.expiresAt,
      createdAt: data.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
    } as AccountInvite;
  });
}

export async function revokeInvite(accountId: string, inviteId: string): Promise<void> {
  const batch = writeBatch(db);
  const ref = doc(db, `accounts/${accountId}/invites/${inviteId}`);
  batch.update(ref, { status: 'REVOKED' });
  await batch.commit();
}

export async function removeMember(accountId: string, uid: string): Promise<void> {
  const batch = writeBatch(db);
  const ref = doc(db, `accounts/${accountId}/members/${uid}`);
  batch.delete(ref);
  await batch.commit();
}
