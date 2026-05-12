'use client';

import Link from 'next/link';
import { useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { formatCurrency, formatDateTime, translateStatus } from '@/lib/display';
import { AdminOverview } from '@/lib/types';
import { useToast } from '@/components/providers/AppProviders';

function StatCard({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color?: string;
}) {
  return (
    <div className="glass-panel rounded-[22px] p-5">
      <p className="text-xs text-white/50">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${color ?? 'text-white'}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-white/35">{sub}</p>}
    </div>
  );
}

function QuickCard({ href, icon, title, desc, badge, badgeColor }: {
  href: string; icon: string; title: string; desc: string; badge?: number; badgeColor?: string;
}) {
  return (
    <Link
      href={href}
      className="glass-panel group flex flex-col gap-3 rounded-[24px] p-6 transition hover:bg-white/8"
    >
      <div className="flex items-start justify-between">
        <span className="flex h-12 w-12 items-center justify-center rounded-[16px] bg-white/8 text-2xl group-hover:bg-white/12">
          {icon}
        </span>
        {badge !== undefined && badge > 0 && (
          <span className={`flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-bold ${badgeColor ?? 'bg-amber-400/25 text-amber-200'}`}>
            {badge}
          </span>
        )}
      </div>
      <div>
        <p className="font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-xs text-white/50">{desc}</p>
      </div>
      <p className="mt-auto text-xs text-white/35 group-hover:text-white/60">เปิดหน้า →</p>
    </Link>
  );
}

function orderStatusColor(status: string) {
  switch (status) {
    case 'PAID': return 'text-amber-300';
    case 'SHIPPED': return 'text-sky-300';
    case 'DELIVERED': return 'text-emerald-300';
    default: return 'text-white/60';
  }
}

export default function AdminClient({ initialOverview }: { initialOverview: AdminOverview | null }) {
  const { pushToast } = useToast();
  const [overview, setOverview] = useState<AdminOverview | null>(initialOverview);
  const [closingAuctions, setClosingAuctions] = useState(false);

  const refresh = async () => {
    const data = (await apiGet('/admin/overview')) as AdminOverview;
    setOverview(data);
  };

  const closeExpiredAuctions = async () => {
    try {
      setClosingAuctions(true);
      const res = await apiPost('/system/close-auctions', {}) as { closedAuctions: string[] };
      pushToast({
        tone: res.closedAuctions.length > 0 ? 'success' : 'info',
        title: res.closedAuctions.length > 0 ? `ปิดการประมูล ${res.closedAuctions.length} รายการ` : 'ไม่มีการประมูลที่หมดเวลา',
        description: res.closedAuctions.length > 0 ? 'ระบบสร้างคำสั่งซื้อให้ผู้ชนะอัตโนมัติแล้ว' : 'การประมูลทุกรายการยังไม่หมดเวลา',
      });
      await refresh();
    } catch (e) {
      pushToast({ tone: 'error', title: 'ปิดการประมูลไม่สำเร็จ', description: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' });
    } finally {
      setClosingAuctions(false);
    }
  };

  const s = overview?.stats;

  return (
    <section className="section-shell py-10 lg:py-14">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="status-chip border-rose-300/24 bg-rose-300/10 text-rose-100">แผงผู้ดูแลระบบ</span>
          <h1 className="mt-4 text-4xl font-bold text-white">ภาพรวมระบบ</h1>
          <p className="soft-copy mt-2 max-w-xl">
            ดูสถิติ กิจกรรมล่าสุด และเข้าถึงเครื่องมือจัดการจากที่นี่
          </p>
        </div>
        <button
          onClick={() => void closeExpiredAuctions()}
          disabled={closingAuctions}
          className="secondary-btn flex items-center gap-2 px-5 py-2.5 text-sm disabled:opacity-50"
        >
          {closingAuctions ? '⏳ กำลังปิด...' : '🔒 ปิดการประมูลที่หมดเวลา'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="ผู้ใช้ทั้งหมด" value={s?.totalUsers ?? '—'} sub="บัญชีที่ลงทะเบียน" />
        <StatCard label="ประมูลที่เปิดอยู่" value={s?.liveAuctions ?? '—'} sub={`จากทั้งหมด ${s?.totalAuctions ?? 0} รายการ`} color="text-emerald-300" />
        <StatCard label="รายได้รวม" value={s ? formatCurrency(s.totalRevenue) : '—'} sub="จากออเดอร์ที่ชำระแล้ว" color="text-amber-300" />
        <StatCard label="รออนุมัติสินค้า" value={s?.pendingProducts ?? '—'} sub="รายการที่ผู้ขายส่งมา" color={s && s.pendingProducts > 0 ? 'text-rose-300' : 'text-white'} />
      </div>

      {/* Secondary stats */}
      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        <StatCard label="คำสั่งซื้อทั้งหมด" value={s?.totalOrders ?? '—'} />
        <StatCard label="รอตรวจสอบชำระเงิน" value={s?.pendingPayments ?? '—'} color={s && s.pendingPayments > 0 ? 'text-emerald-300' : 'text-white'} sub="รายการที่ส่งหลักฐานมา" />
        <StatCard label="รอจัดส่ง" value={s?.paidOrders ?? '—'} color={s && s.paidOrders > 0 ? 'text-amber-300' : 'text-white'} />
        <StatCard label="กำลังขนส่ง" value={s?.shippedOrders ?? '—'} color="text-sky-300" />
      </div>

      {/* Quick nav */}
      <div className="mt-10">
        <h2 className="mb-4 text-lg font-semibold text-white/80">เครื่องมือจัดการ</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickCard
            href="/admin/payments"
            icon="💰"
            title="ตรวจสอบชำระเงิน"
            desc="ดูหลักฐานที่ผู้ซื้อส่งมา อนุมัติหรือปฏิเสธ และอัปเดตสถานะออเดอร์"
            badge={s?.pendingPayments}
            badgeColor="bg-emerald-400/25 text-emerald-200"
          />
          <QuickCard
            href="/admin/products"
            icon="📋"
            title="อนุมัติสินค้า"
            desc="ตรวจสอบและอนุมัติ/ปฏิเสธสินค้าที่ผู้ขายส่งมา เมื่ออนุมัติแล้วระบบจะเปิดประมูลอัตโนมัติ"
            badge={s?.pendingProducts}
            badgeColor="bg-rose-400/25 text-rose-200"
          />
          <QuickCard
            href="/admin/orders"
            icon="🚚"
            title="จัดการการจัดส่ง"
            desc="ดูออเดอร์ที่ชำระแล้ว ใส่เลขพัสดุ และอัปเดตสถานะจัดส่งให้ผู้ซื้อ"
            badge={s?.paidOrders}
            badgeColor="bg-amber-400/25 text-amber-200"
          />
          <QuickCard
            href="/tracking"
            icon="🔍"
            title="ติดตามพัสดุ"
            desc="ค้นหาสถานะการจัดส่งด้วย tracking number หรือรหัสคำสั่งซื้อ"
          />
        </div>
      </div>

      {/* Bottom grid: recent pending + recent orders */}
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {/* Pending products */}
        <div className="glass-panel rounded-[28px] p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-white">สินค้ารออนุมัติ</h2>
            <Link href="/admin/products?status=PENDING" className="text-xs text-white/45 underline underline-offset-4 hover:text-white/70">
              ดูทั้งหมด →
            </Link>
          </div>

          {!overview || overview.pendingProducts.length === 0 ? (
            <p className="mt-5 text-sm text-white/35">ไม่มีสินค้าที่รออนุมัติในขณะนี้</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {overview.pendingProducts.map((p) => (
                <li key={p.id} className="flex items-center gap-3 rounded-[14px] border border-white/8 bg-white/4 px-3 py-2.5">
                  {p.images?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.images[0]} alt="" className="h-9 w-9 flex-shrink-0 rounded-[8px] object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  ) : (
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[8px] bg-white/6 text-sm">📦</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white">{p.title}</p>
                    <p className="text-xs text-white/40">{formatCurrency(p.startPrice ?? 0)}</p>
                  </div>
                  <Link
                    href={`/admin/products`}
                    className="shrink-0 rounded-[10px] border border-amber-300/25 bg-amber-300/8 px-3 py-1 text-xs text-amber-200 hover:bg-amber-300/16"
                  >
                    ตรวจสอบ
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent orders */}
        <div className="glass-panel rounded-[28px] p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-white">คำสั่งซื้อล่าสุด</h2>
            <Link href="/admin/orders" className="text-xs text-white/45 underline underline-offset-4 hover:text-white/70">
              ดูทั้งหมด →
            </Link>
          </div>

          {!overview || overview.recentOrders.length === 0 ? (
            <p className="mt-5 text-sm text-white/35">ยังไม่มีคำสั่งซื้อที่ชำระแล้ว</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {overview.recentOrders.map((o) => (
                <li key={o.id} className="flex items-center gap-3 rounded-[14px] border border-white/8 bg-white/4 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white">{o.productTitle}</p>
                    <p className="text-xs text-white/40">
                      {o.buyerName}
                      {o.createdAt && <span className="mx-1">·</span>}
                      {o.createdAt && formatDateTime(o.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className={`text-xs font-medium ${orderStatusColor(o.status)}`}>
                      {translateStatus(o.status)}
                    </span>
                    <span className="text-xs text-white/50">{formatCurrency(o.amount)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
