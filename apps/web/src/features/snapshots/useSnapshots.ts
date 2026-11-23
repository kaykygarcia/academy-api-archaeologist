import { useEffect, useState } from 'react';
import { listSnapshots, storageError, type ContractSnapshot } from './db';

export function useSnapshots(
  report: (message: string) => void,
  onChanged: (id: string) => void,
) {
  const [snapshots, setSnapshots] = useState<ContractSnapshot[]>([]);
  const [storageMessage, setStorageMessage] = useState('');
  const [storageBusy, setStorageBusy] = useState(false);
  useEffect(() => {
    let active = true;
    listSnapshots()
      .then((records) => {
        if (active) setSnapshots(records);
      })
      .catch((error: unknown) => {
        if (active) setStorageMessage(storageError(error));
      });
    return () => {
      active = false;
    };
  }, []);
  async function refresh() {
    try {
      setSnapshots(await listSnapshots());
      setStorageMessage('');
    } catch (error) {
      setStorageMessage(
        `Não foi possível atualizar a lista de snapshots. ${storageError(error)}`,
      );
    }
  }
  async function retry() {
    setStorageBusy(true);
    await refresh();
    setStorageBusy(false);
  }
  async function write(
    action: () => Promise<unknown>,
    message: string,
    changedId?: string,
  ): Promise<boolean> {
    setStorageBusy(true);
    try {
      await action();
    } catch (error) {
      setStorageMessage(storageError(error));
      report(storageError(error));
      setStorageBusy(false);
      return false;
    }
    if (changedId) onChanged(changedId);
    report(message);
    await refresh();
    setStorageBusy(false);
    return true;
  }
  return { snapshots, storageMessage, storageBusy, write, retry };
}
