'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { useAuthStore } from '@/lib/auth-store';
import { apiPatch, apiPost } from '@/lib/api';
import { useToast } from '@/components/providers/AppProviders';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency, formatDateTime, translateRole } from '@/lib/display';
import { Profile } from '@/lib/types';

type Tab = 'info' | 'security' | 'activity';

function Avatar({ name, size = 'lg' }: { name: string; size?: 'sm' | 'lg' }) {
  const s = size === 'lg' ? 'h-20 w-20 text-2xl' : 'h-10 w-10 text-sm';
  return (
    <div className={`flex flex-shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,#d8f3dc,#f3b253)] font-bold text-slate-950 ${s}`}>
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function InfoSection({ profile, onSaved }: { profile: Profile; onSaved: (p: Partial<Profile>) => void }) {
  const { pushToast } = useToast();
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [address, setAddress] = useState(profile.address ?? '');
  const [saving, setSaving] = useState(false);

  const dirty = name !== profile.name || phone !== (profile.phone ?? '') || address !== (profile.address ?? '');

  const save = async () => {
    if (!name.trim()) return;
    try {
      setSaving(true);
      const updated = await apiPatch('/users/me', { name: name.trim(), phone, address }) as Partial<Profile>;
      onSaved(updated);
      pushToast({ tone: 'success', title: 'บันทึกสำเร็จ', description: 'ข้อมูลโปรไฟล์อัปเดตแล้ว' });
    } catch (e) {
      pushToast({ tone: 'error', title: 'บันทึกไม่สำเร็จ', description: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-white/70">ชื่อ-นามสกุล <span className="text-rose-400">*</span></label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="field" placeholder="ชื่อของคุณ" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-white/70">อีเมล</label>
          <input value={profile.email} disabled className="field opacity-50 cursor-not-allowed" />
          <p className="mt-1 text-xs text-white/30">อีเมลไม่สามารถเปลี่ยนได้</p>
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-white/70">เบอร์โทรศัพท์</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} className="field" placeholder="08x-xxx-xxxx" type="tel" />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-white/70">ที่อยู่สำหรับจัดส่ง</label>
        <textarea
          value={address} onChange={(e) => setAddress(e.target.value)}
          rows={3} className="field resize-none"
          placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
        />
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={() => void save()}
          disabled={saving || !dirty || !name.trim()}
          className="primary-btn px-6 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
        </button>
        {dirty && (
          <button
            onClick={() => { setName(profile.name); setPhone(profile.phone ?? ''); setAddress(profile.address ?? ''); }}
            className="text-sm text-white/40 hover:text-white/70"
          >
            ยกเลิก
          </button>
        )}
      </div>
    </div>
  );
}

function SecuritySection({ provider }: { provider?: string }) {
  const { pushToast } = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isOAuth = provider && provider !== 'local';

  const save = async () => {
    setError('');
    if (next !== confirm) { setError('รหัสผ่านใหม่ไม่ตรงกัน'); return; }
    if (next.length < 6) { setError('รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร'); return; }
    try {
      setSaving(true);
      await apiPost('/users/me/change-password', { currentPassword: current, newPassword: next });
      pushToast({ tone: 'success', title: 'เปลี่ยนรหัสผ่านสำเร็จ', description: 'รหัสผ่านใหม่มีผลทันที' });
      setCurrent(''); setNext(''); setConfirm('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'เกิดข้อผิดพลาด');
    } finally {
      setSaving(false);
    }
  };

  if (isOAuth) {
    return (
      <div className="rounded-[18px] border border-white/8 bg-white/4 p-5 text-center">
        <p className="text-2xl">🔐</p>
        <p className="mt-2 font-medium text-white">บัญชี OAuth</p>
        <p className="mt-1 text-sm text-white/50">
          บัญชีนี้เข้าสู่ระบบด้วย <span className="capitalize text-white/70">{provider}</span> จึงไม่มีรหัสผ่าน
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-white/70">รหัสผ่านปัจจุบัน</label>
        <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} className="field" placeholder="รหัสผ่านเดิม" autoComplete="current-password" />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-white/70">รหัสผ่านใหม่</label>
        <input type="password" value={next} onChange={(e) => setNext(e.target.value)} className="field" placeholder="อย่างน้อย 6 ตัวอักษร" autoComplete="new-password" />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-white/70">ยืนยันรหัสผ่านใหม่</label>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void save()} className="field" placeholder="กรอกอีกครั้ง" autoComplete="new-password" />
      </div>
      {error && <p className="text-sm text-rose-300">{error}</p>}
      <button
        onClick={() => void save()}
        disabled={saving || !current || !next || !confirm}
        className="primary-btn px-6 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? 'กำลังเปลี่ยน...' : 'เปลี่ยนรหัสผ่าน'}
      </button>
    </div>
  );
}

function ActivitySection({ profile }: { profile: Profile }) {
  const [view, setView] = useState<'bids' | 'wins'>('bids');

  return (
    <div>
      <div className="mb-5 flex gap-1 rounded-[16px] border border-white/8 bg-white/4 p-1">
        {(['bids', 'wins'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 rounded-[12px] py-2 text-sm font-medium transition ${view === v ? 'bg-white text-slate-950' : 'text-white/55 hover:text-white'}`}
          >
            {v === 'bids' ? `ประวัติประมูล (${profile.bidHistory.length})` : `รายการที่ชนะ (${profile.wins.length})`}
          </button>
        ))}
      </div>

      {view === 'bids' && (
        profile.bidHistory.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/35">ยังไม่มีประวัติการประมูล</p>
        ) : (
          <ul className="space-y-2">
            {profile.bidHistory.map((bid) => (
              <li key={bid.id} className="flex items-center justify-between gap-4 rounded-[16px] border border-white/8 bg-white/4 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {bid.productTitle || `การประมูล ${String(bid.auctionId).slice(-6).toUpperCase()}`}
                  </p>
                  <p className="mt-0.5 text-xs text-white/40">{formatDateTime(bid.createdAt)}</p>
                </div>
                <p className="shrink-0 font-semibold text-white">{formatCurrency(bid.amount)}</p>
              </li>
            ))}
          </ul>
        )
      )}

      {view === 'wins' && (
        profile.wins.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/35">ยังไม่มีรายการที่ชนะ</p>
        ) : (
          <ul className="space-y-2">
            {profile.wins.map((win) => (
              <li key={win.id} className="flex items-center gap-3 rounded-[16px] border border-white/8 bg-white/4 px-4 py-3">
                {win.product?.images?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={win.product.images[0]} alt="" className="h-12 w-12 flex-shrink-0 rounded-[10px] object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{win.product?.title || win.id}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs text-emerald-300">ชนะแล้ว</span>
                    <span className="text-xs text-white/40">{formatCurrency(win.currentBid)}</span>
                  </div>
                </div>
                <Link href={`/auction/${win.id}`} className="shrink-0 text-xs text-white/35 hover:text-white/70 underline underline-offset-4">
                  ดูการประมูล
                </Link>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'info', label: 'ข้อมูลส่วนตัว', icon: '👤' },
  { key: 'security', label: 'ความปลอดภัย', icon: '🔒' },
  { key: 'activity', label: 'ประวัติการประมูล', icon: '📊' },
];

export default function ProfilePage() {
  const profile = useAuthStore((state) => state.profile);
  const status = useAuthStore((state) => state.status);
  const initialized = useAuthStore((state) => state.initialized);
  const refreshSession = useAuthStore((state) => state.refreshSession);
  const setSession = useAuthStore((state) => state.setSession);

  const [tab, setTab] = useState<Tab>('info');

  useEffect(() => {
    if (!initialized && status !== 'loading') void refreshSession();
  }, [initialized, refreshSession, status]);

  const loading = !profile && (status === 'loading' || !initialized);

  const handleSaved = (updated: Partial<Profile>) => {
    if (!profile) return;
    setSession({ ...profile, ...updated });
  };

  if (!loading && !profile) {
    return (
      <main className="page-bg min-h-screen">
        <Navbar />
        <section className="section-shell flex min-h-[calc(100vh-64px)] items-center justify-center py-10">
          <div className="glass-panel rounded-[30px] p-8 text-center">
            <h1 className="text-3xl font-semibold text-white">คุณยังไม่ได้เข้าสู่ระบบ</h1>
            <p className="soft-copy mx-auto mt-3 max-w-xs text-sm">กรุณาเข้าสู่ระบบเพื่อจัดการโปรไฟล์ของคุณ</p>
            <Link href="/login" className="primary-btn mt-6 inline-block px-6 py-3">เข้าสู่ระบบ</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page-bg min-h-screen">
      <Navbar />
      <section className="section-shell py-10 lg:py-14">
        {loading ? (
          <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
            <div className="glass-panel rounded-[30px] p-7 space-y-4">
              <Skeleton className="h-20 w-20 rounded-full" />
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-52" />
            </div>
            <div className="glass-panel rounded-[30px] p-7 space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        ) : profile ? (
          <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
            {/* Sidebar */}
            <aside className="space-y-4">
              <div className="glass-panel rounded-[28px] p-6">
                <div className="flex flex-col items-center text-center">
                  <Avatar name={profile.name} size="lg" />
                  <h1 className="mt-4 text-xl font-bold text-white">{profile.name}</h1>
                  <p className="mt-0.5 text-sm text-white/50">{profile.email}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded-full border border-white/15 bg-white/8 px-2.5 py-0.5 text-xs text-white/70">
                      {translateRole(profile.role)}
                    </span>
                    {profile.verified && (
                      <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-xs text-emerald-300">
                        ✓ ยืนยันแล้ว
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 border-t border-white/8 pt-5">
                  <div className="rounded-[14px] bg-white/4 p-3 text-center">
                    <p className="text-xl font-bold text-white">{profile.bidHistory.length}</p>
                    <p className="mt-0.5 text-xs text-white/45">ครั้งที่ประมูล</p>
                  </div>
                  <div className="rounded-[14px] bg-white/4 p-3 text-center">
                    <p className="text-xl font-bold text-emerald-300">{profile.wins.length}</p>
                    <p className="mt-0.5 text-xs text-white/45">ชนะแล้ว</p>
                  </div>
                </div>

                {profile.createdAt && (
                  <p className="mt-4 text-center text-xs text-white/30">
                    สมาชิกตั้งแต่ {formatDateTime(profile.createdAt)}
                  </p>
                )}
              </div>

              {/* Quick links */}
              <div className="glass-panel rounded-[28px] p-4">
                <p className="mb-2 px-1 text-xs text-white/35">ลิงก์ด่วน</p>
                {[
                  { href: '/orders', label: 'คำสั่งซื้อของฉัน', icon: '📦' },
                  { href: '/payment', label: 'รายการชำระเงิน', icon: '💳' },
                  { href: '/sell', label: 'ลงขายสินค้า', icon: '🏷️' },
                ].map((l) => (
                  <Link key={l.href} href={l.href} className="flex items-center gap-2.5 rounded-[14px] px-3 py-2.5 text-sm text-white/60 hover:bg-white/6 hover:text-white">
                    <span>{l.icon}</span>
                    <span>{l.label}</span>
                  </Link>
                ))}
              </div>
            </aside>

            {/* Main */}
            <div className="glass-panel rounded-[28px] p-6 lg:p-8">
              {/* Tabs */}
              <div className="mb-6 flex flex-wrap gap-1 rounded-[16px] border border-white/8 bg-white/4 p-1">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-[12px] py-2 text-sm font-medium transition ${tab === t.key ? 'bg-white text-slate-950 shadow-sm' : 'text-white/55 hover:text-white'}`}
                  >
                    <span className="text-base">{t.icon}</span>
                    <span className="hidden sm:inline">{t.label}</span>
                  </button>
                ))}
              </div>

              {tab === 'info' && <InfoSection profile={profile} onSaved={handleSaved} />}
              {tab === 'security' && <SecuritySection provider={profile.provider} />}
              {tab === 'activity' && <ActivitySection profile={profile} />}
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
