import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import type { Snapshot } from '../types';
export function useSnapshot(student?: string) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    try {
      setData(
        await api<Snapshot>(
          '/snapshot' + (student ? '?student=' + encodeURIComponent(student) : ''),
        ),
      );
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, [student]);
  useEffect(() => {
    setData(null);
    void refresh();
  }, [refresh]);
  return { data, error, refresh };
}
