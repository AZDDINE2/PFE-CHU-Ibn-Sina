/**
 * useLive — polling automatique avec indicateur "En direct"
 * Recharge les données toutes les N secondes et notifie le composant.
 */
import { useEffect, useRef, useState, useCallback } from 'react';

interface UseLiveOptions {
  intervalMs?: number;   // intervalle en ms (défaut 30 000 = 30s)
  enabled?: boolean;
}

interface UseLiveResult {
  live: boolean;          // true = mode live actif
  lastUpdate: Date | null;
  toggleLive: () => void;
  tick: number;           // incrémenté à chaque refresh → déclenche useEffect du composant
}

export const useLive = (opts: UseLiveOptions = {}): UseLiveResult => {
  const { intervalMs = 30_000, enabled = true } = opts;
  const [live, setLive]           = useState(enabled);
  const [tick, setTick]           = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTick(t => t + 1);
      setLastUpdate(new Date());
    }, intervalMs);
  }, [intervalMs]);

  useEffect(() => {
    if (live) {
      setLastUpdate(new Date());
      startTimer();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [live, startTimer]);

  const toggleLive = () => setLive(l => !l);

  return { live, lastUpdate, toggleLive, tick };
};
