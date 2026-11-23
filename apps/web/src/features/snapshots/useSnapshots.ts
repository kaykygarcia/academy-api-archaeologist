import { useEffect, useEffectEvent, useState } from 'react';
import {
  listSnapshots,
  storageError,
  SnapshotInputError,
  type ContractSnapshot,
} from './db';

export type WriteResult = { done: boolean; refreshed: boolean };

export function useSnapshots(
  report: (message: string) => void,
  onChanged: (id: string) => void,
  onError: (message: string) => void,
) {
  const [snapshots, setSnapshots] = useState<ContractSnapshot[]>([]);
  const [storageMessage, setStorageMessage] = useState('');
  const [storageBusy, setStorageBusy] = useState(false);
  const reportInitialError = useEffectEvent(onError);
  useEffect(() => {
    let active = true;
    listSnapshots()
      .then((records) => {
        if (active) setSnapshots(records);
      })
      .catch((error: unknown) => {
        if (active) {
          const message = storageError(error);
          setStorageMessage(message);
          reportInitialError(message);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  async function refresh() {
    try {
      setSnapshots(await listSnapshots());
      setStorageMessage('');
      return true;
    } catch (error) {
      const message = `Não foi possível atualizar a lista de snapshots. ${storageError(error)}`;
      setStorageMessage(message);
      onError(message);
      return false;
    }
  }
  function clearMessage() {
    setStorageMessage('');
  }
  async function retry() {
    clearMessage();
    setStorageBusy(true);
    await refresh();
    setStorageBusy(false);
  }
  async function write(
    action: () => Promise<unknown>,
    message: string,
    changedId?: string,
  ): Promise<WriteResult> {
    clearMessage();
    setStorageBusy(true);
    try {
      await action();
    } catch (error) {
      const errorMessage =
        error instanceof SnapshotInputError
          ? error.message
          : storageError(error);
      setStorageMessage(errorMessage);
      onError(errorMessage);
      setStorageBusy(false);
      return { done: false, refreshed: false };
    }
    if (changedId) onChanged(changedId);
    report(message);
    const refreshed = await refresh();
    setStorageBusy(false);
    return { done: true, refreshed };
  }
  return { snapshots, storageMessage, storageBusy, write, retry, clearMessage };
}
