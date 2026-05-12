'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { useAuthStore } from '@/lib/auth-store';
import { PageSkeleton } from '@/components/ui/PageSkeleton';

export function PublicOnlyGuard({ children }: { children: React.ReactNode }) {
  const profile = useAuthStore((state) => state.profile);
  const status = useAuthStore((state) => state.status);
  const initialized = useAuthStore((state) => state.initialized);
  const initializeSession = useAuthStore((state) => state.initializeSession);

  useEffect(() => {
    if (!initialized) {
      void initializeSession();
    }
  }, [initializeSession, initialized]);

  const loading = status === 'loading' || !initialized;

  if (loading) {
    return (
      <main className="page-bg min-h-screen">
        <Navbar />
        <PageSkeleton />
      </main>
    );
  }

  if (profile) {
    return (
      <main className="page-bg min-h-screen">
        <Navbar />
        <section className="section-shell py-10 lg:py-14">
          <div className="glass-panel rounded-[30px] p-8 text-center">
            <p className="text-sm uppercase tracking-[0.18em] text-white/45">
              Already signed in
            </p>
            <h1 className="mt-3 text-3xl font-semibold text-white">คุณเข้าสู่ระบบอยู่แล้ว</h1>
            <p className="soft-copy mx-auto mt-3 max-w-2xl text-sm">
              ตอนนี้คุณสามารถไปต่อที่หน้าโปรไฟล์ หน้าแรก หรือหน้าที่เกี่ยวกับสมาชิกได้ทันที
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href="/profile" className="primary-btn px-6 py-3">
                ไปหน้าโปรไฟล์
              </Link>
              <Link href="/" className="secondary-btn px-6 py-3">
                กลับหน้าหลัก
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
