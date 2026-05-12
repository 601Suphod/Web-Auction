'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuthStore } from '@/lib/auth-store';
import { PageSkeleton } from '@/components/ui/PageSkeleton';

type GuardMode = 'member' | 'admin';

export function RouteGuard({
  children,
  mode,
}: {
  children: React.ReactNode;
  mode: GuardMode;
}) {
  const router = useRouter();
  const profile = useAuthStore((state) => state.profile);
  const status = useAuthStore((state) => state.status);
  const initialized = useAuthStore((state) => state.initialized);
  const initializeSession = useAuthStore((state) => state.initializeSession);

  useEffect(() => {
    if (!initialized) {
      void initializeSession();
    }
  }, [initializeSession, initialized]);

  const loading = !profile && (status === 'loading' || !initialized);
  const allowed = Boolean(profile && (mode === 'member' || profile.role === 'ADMIN'));

  useEffect(() => {
    if (loading || allowed) return;
    if (!profile) {
      router.replace('/login');
      return;
    }
    router.replace('/');
  }, [allowed, loading, profile, router]);

  if (loading || !allowed) {
    return (
      <main className="page-bg min-h-screen">
        <Navbar />
        <PageSkeleton />
      </main>
    );
  }

  return <>{children}</>;
}
