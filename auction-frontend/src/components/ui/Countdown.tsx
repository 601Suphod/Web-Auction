'use client';

import { useEffect, useState } from 'react';

interface CountdownProps {
  endAt: string;
  serverNow: string;
  className?: string;
  compact?: boolean;
}

function calcRemaining(endAt: string, serverNow: string): number {
  const clientNow = Date.now();
  const serverTime = new Date(serverNow).getTime();
  const clockOffset = clientNow - serverTime;
  return Math.max(0, new Date(endAt).getTime() - (clientNow - clockOffset));
}

export function Countdown({ endAt, serverNow, className = '', compact = false }: CountdownProps) {
  const [remaining, setRemaining] = useState(() => calcRemaining(endAt, serverNow));

  useEffect(() => {
    setRemaining(calcRemaining(endAt, serverNow));
  }, [endAt, serverNow]);

  useEffect(() => {
    if (remaining <= 0) return;
    const interval = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1000;
        return next <= 0 ? 0 : next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [remaining]);

  if (remaining <= 0) {
    return (
      <span className={`font-semibold text-red-400 ${className}`}>
        หมดเวลา
      </span>
    );
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const isUrgent = remaining < 60 * 60 * 1000; // < 1 hour
  const isCritical = remaining < 10 * 60 * 1000; // < 10 minutes

  const colorClass = isCritical
    ? 'text-red-400'
    : isUrgent
      ? 'text-amber-400'
      : 'text-emerald-300';

  if (compact) {
    if (days > 0) return <span className={`${colorClass} ${className}`}>{days}ว {hours}ชม</span>;
    if (hours > 0) return <span className={`${colorClass} ${className}`}>{hours}:{String(minutes).padStart(2,'0')} ชม</span>;
    return (
      <span className={`font-mono font-bold ${colorClass} ${className}`}>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    );
  }

  if (days > 0) {
    return (
      <span className={`${colorClass} ${className}`}>
        {days} วัน {hours} ชม.
      </span>
    );
  }
  if (hours > 0) {
    return (
      <span className={`${colorClass} ${className}`}>
        {hours} ชม. {minutes} นาที
      </span>
    );
  }

  return (
    <span className={`font-mono font-bold ${colorClass} ${className}`}>
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </span>
  );
}
