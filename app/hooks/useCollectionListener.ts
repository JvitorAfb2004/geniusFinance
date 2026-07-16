import { useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError } from '../lib/handleFirestoreError';
import { resolveDataPath } from '../lib/pathAdapter';
import type { FinanceCollectionName } from '../lib/pathAdapter';
import type { ActiveScope } from '../types';
import type { User } from 'firebase/auth';
import { converters } from '../lib/firestoreConverters';

/**
 * ponytail: generic Firestore collection listener — replaces 11 copy-pasted useEffect blocks.
 * Uses refs for transform/setter so the effect only re-subscribes on user/scope/collection changes.
 * Now uses typed converters — no manual casting in call sites.
 */
export function useCollectionListener<T>(
  user: User | null,
  activeScope: ActiveScope,
  collectionName: FinanceCollectionName,
  setter: (items: T[]) => void,
  onLoaded?: () => void,
) {
  const setterRef = useRef(setter);
  const onLoadedRef = useRef(onLoaded);
  setterRef.current = setter;
  onLoadedRef.current = onLoaded;

  useEffect(() => {
    if (!user) return;
    const dataPath = resolveDataPath(activeScope, user.uid, collectionName);
    const colRef = collection(db, dataPath).withConverter(converters[collectionName] as any);
    const q = activeScope.type === 'PERSONAL'
      ? query(colRef, where('userId', '==', user.uid))
      : query(colRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setterRef.current(snapshot.docs.map(docSnap => docSnap.data() as T));
      onLoadedRef.current?.();
    }, (err) => {
      handleFirestoreError(err, 'list', dataPath, user);
    });

    return () => unsubscribe();
  }, [user, activeScope, collectionName]);
}
