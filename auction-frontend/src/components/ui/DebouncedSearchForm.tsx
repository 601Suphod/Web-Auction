'use client';

import { FormEvent, ReactNode, useRef } from 'react';

type DebouncedSearchFormProps = {
  className?: string;
  action?: string;
  delayMs?: number;
  children: ReactNode;
};

export function DebouncedSearchForm({ className, action, delayMs = 400, children }: DebouncedSearchFormProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queueSubmit = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      formRef.current?.requestSubmit();
    }, delayMs);
  };

  const handleChange = (event: FormEvent<HTMLFormElement>) => {
    const target = event.target as HTMLElement;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;
    queueSubmit();
  };

  return (
    <form ref={formRef} action={action} method="get" className={className} onChange={handleChange}>
      {children}
    </form>
  );
}

