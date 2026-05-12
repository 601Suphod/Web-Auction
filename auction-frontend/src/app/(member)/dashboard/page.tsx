'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { apiGet } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency, formatDateTime } from '@/lib/display';
import { SellerDashboard, Product, Auction } from '@/lib/types';

// ─── helpers ──────────────────────────────────────────────────────────────────

function productStatusStyle(status: string) {
  switch (status) {
    case 'APPROVED':  return 'border-emerald-400/30 bg-emerald-400/12 text-emerald-200';
    case 'PENDING':   return 'border-amber-300/30 bg-amber-300/12 text-amber-200';
    case 'REJECTED':  return 'border-rose-400/30 bg-rose-400/12 text-rose-200';
    default:          return 'border-white/15 bg-white/8 text-white/55';
  }
}

function productStatusLabel(status: string) {
  switch (status) {
    case 'APPROVED':  return 'อนุมัติแล้ว';
    case 'PENDING':   return 'รออนุมัติ';
    case 'REJECTED':  return 'ถูกปฏิเสธ';
    default:          return status;
  }
}

function auctionStatusStyle(status: string) {
  switch (status) {
    case 'LIVE':      return 'border-emerald-400/30 bg-emerald-400/12 text-emerald-200';
    case 'SCHEDULED': return 'border-sky-300/30 bg-sky-300/12 text-sky-200';
    case 'ENDED':     return 'border-white/15 bg-white/6 text-white/45';
    default:          return 'border-white/15 bg-white/6 text-white/45';
  }
}

function auctionStatusLabel(status: string) {
  switch (status) {
    case 'LIVE':      return '🔴 กำลังประมูล';
    case 'SCHEDULED': return '🕐 รอเปิด';
    case 'ENDED':     return 'ปิดแล้ว';
    default:          return status;
  }
}

function useCountdown(endAt: string | undefined) {
  const [text, setText] = useState('');
  useEffect(() => {
    if (!endAt) return;
    const tick = () => {
      const diff = new Date(endAt).getTime() - Date.now();
      if (diff <= 0) { setText('หมดเวลา'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) setText(`${d}ว ${h}ชม`);
      else if (h > 0) setText(`${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      else setText(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endAt]);
  return text;
}

// ─── sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, color, icon }: { label: string; value: string | number; color?: string; icon: string }) {
  return (
    <div className="glass-panel rounded-[22px] p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-white/50">{label}</p>
        <span className="text-lg">{icon}</span>
      </div>
      <p className={`mt-3 text-3xl font-bold ${color ?? 'text-white'}`}>{value}</p>
    </div>
  );
}

const PRODUCT_TABS = [
  { value: 'ALL', label: 'ทั้งหมด' },
  { value: 'PENDING', label: 'รออนุมัติ' },
  { value: 'APPROVED', label: 'อนุมัติแล้ว' },
  { value: 'REJECTED', label: 'ถูกปฏิเสธ' },
];

function ProductCard({ p, auction }: { p: Product; auction?: Auction }) {
  return (
    <article className="flex items-start gap-3 rounded-[18px] border border-white/8 bg-white/4 p-3.5 transition hover:bg-white/6">
      {p.images?.[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={p.images[0]}
          alt={p.title}
          className="h-14 w-14 flex-shrink-0 rounded-[12px] object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[12px] bg-white/6 text-xl">📦</div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="truncate text-sm font-medium text-white">{p.title}</p>
          <span className={`status-chip shrink-0 text-[11px] ${productStatusStyle(p.status)}`}>
            {productStatusLabel(p.status)}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-white/40">
          ราคาเริ่ม {formatCurrency(p.startPrice ?? 0)}
          {p.createdAt && <span className="ml-2 text-white/25">{formatDateTime(p.createdAt)}</span>}
        </p>
        {auction && (
          <div className="mt-1.5 flex items-center gap-2">
            <span className={`status-chip text-[10px] ${auctionStatusStyle(auction.status)}`}>
              {auctionStatusLabel(auction.status)}
            </span>
            {auction.status !== 'SCHEDULED' && (
              <span className="text-xs text-white/50">
                ราคาปัจจุบัน <span className="font-semibold text-white/80">{formatCurrency(auction.currentBid)}</span>
              </span>
            )}
            <Link
              href={`/auction/${auction.id}`}
              className="ml-auto text-xs text-white/35 underline underline-offset-2 hover:text-white/60"
            >
              ดูประมูล →
            </Link>
          </div>
        )}
        {p.status === 'REJECTED' && (
          <p className="mt-1 text-xs text-rose-300/70">สินค้าถูกปฏิเสธ — ลองลงขายใหม่</p>
        )}
      </div>
    </article>
  );
}

function AuctionCard({ a }: { a: Auction }) {
  const countdown = useCountdown(a.status === 'LIVE' ? a.endAt : undefined);
  return (
    <article className="flex items-start gap-3 rounded-[18px] border border-white/8 bg-white/4 p-3.5 transition hover:bg-white/6">
      {a.product?.images?.[0] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={a.product.images[0]}
          alt={a.product.title}
          className="h-14 w-14 flex-shrink-0 rounded-[12px] object-cover"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-[12px] bg-white/6 text-xl">🏷️</div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <p className="truncate text-sm font-medium text-white">{a.product?.title || `Auction ${a.id.slice(-6)}`}</p>
          <span className={`status-chip shrink-0 text-[11px] ${auctionStatusStyle(a.status)}`}>
            {auctionStatusLabel(a.status)}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-white/50">
          <span>ราคาปัจจุบัน <span className="font-semibold text-white/80">{formatCurrency(a.currentBid)}</span></span>
          {(a.bidCount ?? 0) > 0 && <span>{a.bidCount} การเสนอราคา</span>}
          {a.status === 'LIVE' && countdown && (
            <span className="font-mono text-emerald-300">⏱ {countdown}</span>
          )}
          {a.status === 'ENDED' && a.winnerId && (
            <span className="text-amber-300/80">มีผู้ชนะแล้ว</span>
          )}
          {a.status === 'ENDED' && !a.winnerId && (
            <span className="text-white/35">ไม่มีผู้เสนอราคา</span>
          )}
        </div>
        <div className="mt-1 flex items-center justify-between">
          {a.status !== 'LIVE'
            ? <p className="text-xs text-white/30">{a.status === 'ENDED' ? 'ปิด ' : 'เปิด '}{formatDateTime(a.status === 'ENDED' ? a.endAt : a.startAt)}</p>
            : <p className="text-xs text-white/30">ปิดประมูล {formatDateTime(a.endAt)}</p>
          }
          <Link
            href={`/auction/${a.id}`}
            className="text-xs text-white/35 underline underline-offset-2 hover:text-white/60"
          >
            ดูประมูล →
          </Link>
        </div>
      </div>
    </article>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const profile = useAuthStore((state) => state.profile);
  const [dashboard, setDashboard] = useState<SellerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [productTab, setProductTab] = useState('ALL');
  const [auctionTab, setAuctionTab] = useState('ALL');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = (await apiGet('/seller/dashboard?limit=50')) as SellerDashboard;
        setDashboard(data);
        setError('');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'โหลดแดชบอร์ดไม่สำเร็จ');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filteredProducts = useMemo(() => {
    if (!dashboard) return [];
    if (productTab === 'ALL') return dashboard.products;
    return dashboard.products.filter((p) => p.status === productTab);
  }, [dashboard, productTab]);

  const filteredAuctions = useMemo(() => {
    if (!dashboard) return [];
    if (auctionTab === 'ALL') return dashboard.auctions;
    return dashboard.auctions.filter((a) => a.status === auctionTab);
  }, [dashboard, auctionTab]);

  // build a map: productId → auction
  const auctionByProduct = useMemo(() => {
    const map: Record<string, Auction> = {};
    dashboard?.auctions.forEach((a) => {
      if (a.product?.id) map[a.product.id] = a;
    });
    return map;
  }, [dashboard]);

  const s = dashboard?.summary;

  return (
    <main className="page-bg min-h-screen">
      <Navbar />
      <section className="section-shell py-10 lg:py-14">

        {/* Header */}
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="status-chip border-amber-300/24 bg-amber-300/10 text-amber-100">แดชบอร์ดผู้ขาย</span>
            <h1 className="mt-4 text-4xl font-bold text-white">
              สวัสดี{profile?.name ? ` ${profile.name}` : ''} 👋
            </h1>
            <p className="soft-copy mt-2 max-w-xl">ภาพรวมสินค้าและการประมูลทั้งหมดของคุณ</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {profile?.role === 'ADMIN' && (
              <Link href="/admin" className="secondary-btn px-5 py-2.5 text-sm">จัดการระบบ</Link>
            )}
            <Link href="/sell" className="primary-btn px-5 py-2.5 text-sm font-semibold">+ ลงขายสินค้าใหม่</Link>
          </div>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1,2,3,4].map((i) => (
              <div key={i} className="glass-panel rounded-[22px] p-5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-4 h-8 w-20" />
              </div>
            ))}
          </div>
        ) : s ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="สินค้าทั้งหมด" value={s.totalListings} icon="📦" />
            <StatCard label="กำลังประมูล" value={s.liveAuctions} icon="🔴" color="text-emerald-300" />
            <StatCard label="ขายสำเร็จ" value={s.soldListings} icon="✅" color="text-amber-300" />
            <StatCard label="รายได้รวม" value={formatCurrency(s.grossRevenue)} icon="💰" color="text-amber-300" />
          </div>
        ) : null}

        {error && (
          <div className="mt-4 rounded-[18px] border border-rose-400/20 bg-rose-400/8 p-4 text-sm text-rose-200">{error}</div>
        )}

        {/* Main grid */}
        {!loading && dashboard && (
          <div className="mt-8 grid gap-6 lg:grid-cols-2">

            {/* Products */}
            <div className="glass-panel rounded-[28px] p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-white">สินค้าของฉัน</h2>
                <Link href="/sell" className="text-xs text-white/40 underline underline-offset-4 hover:text-white/70">
                  + ลงขายใหม่
                </Link>
              </div>

              {/* Product tabs */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {PRODUCT_TABS.map((tab) => {
                  const count = tab.value === 'ALL'
                    ? dashboard.products.length
                    : dashboard.products.filter((p) => p.status === tab.value).length;
                  return (
                    <button
                      key={tab.value}
                      onClick={() => setProductTab(tab.value)}
                      className={`rounded-[10px] border px-3 py-1 text-xs transition ${productTab === tab.value ? 'border-white/20 bg-white/12 text-white' : 'border-white/8 bg-white/4 text-white/45 hover:bg-white/8'}`}
                    >
                      {tab.label}
                      {count > 0 && <span className="ml-1.5 text-white/35">{count}</span>}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4">
                {filteredProducts.length === 0 ? (
                  <EmptyState
                    title={productTab === 'ALL' ? 'ยังไม่มีสินค้า' : `ไม่มีสินค้าสถานะ "${PRODUCT_TABS.find(t=>t.value===productTab)?.label}"`}
                    description={productTab === 'ALL' ? 'เริ่มลงขายสินค้าชิ้นแรกได้เลย' : ''}
                  />
                ) : (
                  <div className="space-y-2">
                    {filteredProducts.map((p) => (
                      <ProductCard key={p.id} p={p} auction={auctionByProduct[p.id]} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Auctions */}
            <div className="glass-panel rounded-[28px] p-6">
              <h2 className="font-semibold text-white">การประมูลของฉัน</h2>

              {/* Auction tabs */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(['ALL', 'LIVE', 'SCHEDULED', 'ENDED'] as const).map((tab) => {
                  const count = tab === 'ALL'
                    ? dashboard.auctions.length
                    : dashboard.auctions.filter((a) => a.status === tab).length;
                  const labels: Record<string, string> = { ALL: 'ทั้งหมด', LIVE: 'กำลังประมูล', SCHEDULED: 'รอเปิด', ENDED: 'ปิดแล้ว' };
                  return (
                    <button
                      key={tab}
                      onClick={() => setAuctionTab(tab)}
                      className={`rounded-[10px] border px-3 py-1 text-xs transition ${auctionTab === tab ? 'border-white/20 bg-white/12 text-white' : 'border-white/8 bg-white/4 text-white/45 hover:bg-white/8'}`}
                    >
                      {labels[tab]}
                      {count > 0 && <span className="ml-1.5 text-white/35">{count}</span>}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4">
                {filteredAuctions.length === 0 ? (
                  <EmptyState
                    title={dashboard.auctions.length === 0 ? 'ยังไม่มีการประมูล' : 'ไม่มีการประมูลในหมวดนี้'}
                    description={dashboard.auctions.length === 0 ? 'เมื่อสินค้าถูกอนุมัติ ระบบจะเปิดประมูลอัตโนมัติ' : ''}
                  />
                ) : (
                  <div className="space-y-2">
                    {filteredAuctions.map((a) => (
                      <AuctionCard key={a.id} a={a} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick links */}
        {!loading && (
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Link href="/orders" className="glass-panel flex items-center gap-3 rounded-[20px] p-4 transition hover:bg-white/8">
              <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white/8 text-xl">📋</span>
              <div>
                <p className="text-sm font-medium text-white">คำสั่งซื้อของฉัน</p>
                <p className="text-xs text-white/40">ดูสถานะและติดตามสินค้า</p>
              </div>
            </Link>
            <Link href="/payment" className="glass-panel flex items-center gap-3 rounded-[20px] p-4 transition hover:bg-white/8">
              <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white/8 text-xl">💳</span>
              <div>
                <p className="text-sm font-medium text-white">ชำระเงิน</p>
                <p className="text-xs text-white/40">ชำระออเดอร์ที่รอการชำระ</p>
              </div>
            </Link>
            <Link href="/profile" className="glass-panel flex items-center gap-3 rounded-[20px] p-4 transition hover:bg-white/8">
              <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-white/8 text-xl">👤</span>
              <div>
                <p className="text-sm font-medium text-white">โปรไฟล์</p>
                <p className="text-xs text-white/40">แก้ไขข้อมูลส่วนตัว</p>
              </div>
            </Link>
          </div>
        )}

      </section>
    </main>
  );
}
