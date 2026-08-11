import { useEffect, useMemo, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError } from '../lib/handleFirestoreError';
import { useFinance } from './useFinance';
import type { PluggyConnection, PluggyProvision } from '../types';

export function usePluggy() {
  const { user, activeScope } = useFinance();
  const [connections, setConnections] = useState<PluggyConnection[]>([]);
  const [allProvisions, setAllProvisions] = useState<PluggyProvision[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'pluggy_connections'), where('userId', '==', user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => setConnections(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PluggyConnection)),
      (err) => handleFirestoreError(err, 'list', 'pluggy_connections', user),
    );
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'pluggy_provisions'), where('userId', '==', user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setAllProvisions(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PluggyProvision));
        setLoaded(true);
      },
      (err) => handleFirestoreError(err, 'list', 'pluggy_provisions', user),
    );
    return unsub;
  }, [user]);

  const connection = useMemo(() => connections.find((c) => c.status === 'ACTIVE') || null, [connections]);

  const provisions = useMemo(() => {
    return allProvisions.filter((p) => {
      if (activeScope.type === 'PERSONAL') return p.scopeType === 'PERSONAL';
      return p.scopeType === 'ACCOUNT' && p.scopeId === activeScope.accountId;
    });
  }, [allProvisions, activeScope]);

  const pendingCount = useMemo(
    () => provisions.filter((p) => p.provisionStatus === 'PROVISION').length,
    [provisions],
  );

  const updateProvision = async (provisionId: string, updates: Partial<PluggyProvision>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'pluggy_provisions', provisionId), {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, 'update', `pluggy_provisions/${provisionId}`, user);
    }
  };

  const ignoreProvision = (id: string) => updateProvision(id, { provisionStatus: 'IGNORED' });
  const restoreProvision = (id: string) => updateProvision(id, { provisionStatus: 'PROVISION', convertedToTransactionId: null });

  const createManualProvision = async (data: {
    description: string;
    amount: number;
    date: string;
    type: 'INCOME' | 'EXPENSE';
  }): Promise<string | undefined> => {
    if (!user) return;
    try {
      const payload: PluggyProvision = {
        id: '',
        userId: user.uid,
        scopeType: activeScope.type === 'PERSONAL' ? 'PERSONAL' : 'ACCOUNT',
        scopeId: activeScope.type === 'ACCOUNT' ? activeScope.accountId : null,
        pluggyTransactionId: '',
        pluggyItemId: '',
        pluggyAccountId: '',
        amount: data.amount,
        date: data.date,
        description: data.description,
        type: data.type,
        status: 'PENDING',
        provisionStatus: 'PROVISION',
        convertedToTransactionId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, 'pluggy_provisions'), payload);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, 'create', 'pluggy_provisions', user);
    }
  };

  return { connection, provisions, pendingCount, loaded, updateProvision, ignoreProvision, restoreProvision, createManualProvision };
}
