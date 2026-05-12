import { useState, useEffect } from "react";

export interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number; // total ms remaining
  expired: boolean;
}

export function useCountdown(targetDate: Date | null): CountdownResult {
  const calc = (): CountdownResult => {
    if (!targetDate) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0, expired: true };
    const total = targetDate.getTime() - Date.now();
    if (total <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0, expired: true };
    const days    = Math.floor(total / (1000 * 60 * 60 * 24));
    const hours   = Math.floor((total % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((total % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((total % (1000 * 60)) / 1000);
    return { days, hours, minutes, seconds, total, expired: false };
  };

  const [state, setState] = useState<CountdownResult>(calc);

  useEffect(() => {
    if (!targetDate) return;
    setState(calc());
    const id = setInterval(() => setState(calc()), 1000);
    return () => clearInterval(id);
  }, [targetDate?.getTime()]);

  return state;
}
