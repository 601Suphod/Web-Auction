'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearToken } from '@/lib/auth';
import { useAuthStore } from '@/lib/auth-store';
import { translateRole } from '@/lib/display';
import { useToast } from '@/components/providers/AppProviders';

const publicLinks = [
  { href: '/', label: 'หน้าหลัก' },
  { href: '/tracking', label: 'ติดตามสินค้า' },
];

const memberLinks = [
  { href: '/dashboard', label: 'แดชบอร์ด' },
  { href: '/orders', label: 'คำสั่งซื้อ' },
  { href: '/sell', label: 'ลงขาย' },
  { href: '/payment', label: 'ชำระเงิน' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { pushToast } = useToast();
  const profile = useAuthStore((state) => state.profile);
  const status = useAuthStore((state) => state.status);
  const [isPending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);

  const onLogout = () => {
    startTransition(async () => {
      await clearToken();
      setMenuOpen(false);
      pushToast({
        tone: 'info',
        title: 'ออกจากระบบแล้ว',
        description: 'คุณกลับสู่โหมดผู้เยี่ยมชมเรียบร้อยแล้ว',
      });
      router.push('/');
      router.refresh();
    });
  };

  const links = [
    ...publicLinks,
    ...(profile ? memberLinks : []),
    ...(profile?.role === 'ADMIN'
      ? [
          { href: '/admin', label: 'จัดการระบบ' },
          { href: '/admin/payments', label: 'ตรวจสอบชำระเงิน' },
          { href: '/admin/orders', label: 'จัดส่ง' },
          { href: '/admin/products', label: 'อนุมัติสินค้า' },
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[rgba(7,17,21,0.82)] backdrop-blur-xl">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/6 px-3 py-2 transition hover:bg-white/10"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,#8dd3c7,#52b788)] text-xs font-bold text-slate-950">
            AH
          </span>
          <div className="leading-tight">
            <div className="text-sm font-bold text-white">AuctionHub</div>
            <div className="hidden text-[10px] uppercase tracking-[0.2em] text-white/45 sm:block">
              ตลาดประมูลแบบเรียลไทม์
            </div>
          </div>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3.5 py-2 text-sm transition ${
                  active
                    ? 'bg-white text-slate-950 font-semibold shadow-[0_8px_24px_rgba(255,255,255,0.15)]'
                    : 'text-white/65 hover:bg-white/8 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right: auth + hamburger */}
        <div className="flex items-center gap-2">
          {/* Desktop auth */}
          <div className="hidden items-center gap-2 md:flex">
            {profile ? (
              <>
                <Link
                  href="/profile"
                  className="flex items-center gap-2.5 rounded-full border border-emerald-300/20 bg-emerald-100/8 px-3 py-2 transition hover:bg-emerald-100/14"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-300 text-xs font-bold text-slate-950">
                    {profile.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="hidden sm:block">
                    <span className="block text-sm font-medium text-white">{profile.name}</span>
                    <span className="block text-[11px] text-white/50">{translateRole(profile.role)}</span>
                  </span>
                </Link>
                <button
                  onClick={onLogout}
                  disabled={isPending}
                  className="rounded-full border border-white/12 px-3.5 py-2 text-sm text-white/65 transition hover:bg-white/8 hover:text-white disabled:opacity-50"
                >
                  {isPending ? '...' : 'ออกจากระบบ'}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-full px-4 py-2 text-sm text-white/65 transition hover:bg-white/8 hover:text-white"
                >
                  {status === 'loading' ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
                </Link>
                <Link
                  href="/register"
                  className="primary-btn px-4 py-2 text-sm"
                >
                  สมัครสมาชิก
                </Link>
              </>
            )}
          </div>

          {/* Hamburger (mobile) */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/80 transition hover:bg-white/12 md:hidden"
            aria-label="เปิดเมนู"
          >
            {menuOpen ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-white/8 bg-[rgba(7,17,21,0.96)] px-4 pb-5 pt-3 md:hidden">
          <div className="flex flex-col gap-1">
            {links.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-2xl px-4 py-3 text-sm transition ${
                    active ? 'bg-white/12 font-semibold text-white' : 'text-white/65 hover:bg-white/6 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="mt-4 border-t border-white/8 pt-4">
            {profile ? (
              <div className="flex items-center justify-between gap-3">
                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-300 text-sm font-bold text-slate-950">
                    {profile.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-white">{profile.name}</p>
                    <p className="text-xs text-white/50">{translateRole(profile.role)}</p>
                  </div>
                </Link>
                <button
                  onClick={onLogout}
                  disabled={isPending}
                  className="rounded-full border border-white/12 px-4 py-2 text-sm text-white/65 hover:bg-white/8"
                >
                  ออกจากระบบ
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="secondary-btn py-2.5 text-center text-sm"
                >
                  เข้าสู่ระบบ
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMenuOpen(false)}
                  className="primary-btn py-2.5 text-center text-sm"
                >
                  สมัครสมาชิก
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
