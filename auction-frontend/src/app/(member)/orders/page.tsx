'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { apiGet } from '@/lib/api';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency, formatDateTime } from '@/lib/display';
import { OrderRecord } from '@/lib/types';

// ─── status helpers ───────────────────────────────────────────────────────────

function statusChipStyle(status: string) {
  switch (status) {
    case 'PENDING':               return 'border-amber-300/30 bg-amber-300/12 text-amber-200';
    case 'AWAITING_VERIFICATION': return 'border-sky-300/30 bg-sky-300/12 text-sky-200';
    case 'PAID':                  return 'border-emerald-400/30 bg-emerald-400/12 text-emerald-200';
    case 'SHIPPED':               return 'border-blue-400/30 bg-blue-400/12 text-blue-200';
    case 'DELIVERED':             return 'border-emerald-500/30 bg-emerald-500/12 text-emerald-300';
    case 'FAILED':                return 'border-rose-400/30 bg-rose-400/12 text-rose-200';
    default:                      return 'border-white/15 bg-white/8 text-white/55';
  }
}

function statusLabel(status: string) {
  switch (status) {
    case 'PENDING':               return '⏳ รอชำระเงิน';
    case 'AWAITING_VERIFICATION': return '🔍 รอตรวจสอบ';
    case 'PAID':                  return '✅ ชำระแล้ว';
    case 'SHIPPED':               return '🚚 กำลังจัดส่ง';
    case 'DELIVERED':             return '📦 ส่งถึงแล้ว';
    case 'FAILED':                return '✕ ไม่อนุมัติ';
    default:                      return status;
  }
}

function shipmentStatusLabel(status: string) {
  switch (status) {
    case 'IN_TRANSIT': return '🚚 กำลังขนส่ง';
    case 'DELIVERED':  return '📦 ถึงปลายทาง';
    default:           return status;
  }
}

// ─── steps timeline ───────────────────────────────────────────────────────────

const STEPS = [
  { key: 'PENDING',               label: 'รอชำระเงิน' },
  { key: 'AWAITING_VERIFICATION', label: 'รอตรวจสอบ' },
  { key: 'PAID',                  label: 'ชำระแล้ว' },
  { key: 'SHIPPED',               label: 'จัดส่งแล้ว' },
  { key: 'DELIVERED',             label: 'ส่งถึงแล้ว' },
];

function getStepIndex(status: string) {
  return STEPS.findIndex((s) => s.key === status);
}

function OrderTimeline({ status }: { status: string }) {
  const active = getStepIndex(status);
  if (active === -1) return null;
  return (
    <div className="mt-4 flex items-center gap-0">
      {STEPS.map((step, i) => {
        const done = i <= active;
        const isActive = i === active;
        return (
          <div key={step.key} className="flex flex-1 items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold transition ${isActive ? 'border-emerald-400 bg-emerald-400 text-slate-950' : done ? 'border-emerald-400/60 bg-emerald-400/20 text-emerald-300' : 'border-white/15 bg-white/4 text-white/25'}`}>
                {done ? '✓' : i + 1}
              </div>
              <p className={`hidden text-[9px] sm:block ${isActive ? 'text-emerald-300' : done ? 'text-white/40' : 'text-white/20'}`}>
                {step.label}
              </p>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`mb-4 h-0.5 flex-1 transition ${i < active ? 'bg-emerald-400/50' : 'bg-white/8'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── order card ───────────────────────────────────────────────────────────────

const FILTER_TABS = [
  { value: 'ALL',                  label: 'ทั้งหมด' },
  { value: 'PENDING',              label: 'รอชำระ' },
  { value: 'AWAITING_VERIFICATION',label: 'รอตรวจสอบ' },
  { value: 'PAID',                 label: 'ชำระแล้ว' },
  { value: 'SHIPPED',              label: 'กำลังจัดส่ง' },
  { value: 'DELIVERED',            label: 'ส่งถึงแล้ว' },
];

function OrderCard({ order }: { order: OrderRecord }) {
  return (
    <article className="glass-panel rounded-[28px] p-5">
      {/* Top row: image + title + status + amount */}
      <div className="flex items-start gap-4">
        {order.product?.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={order.product.images[0]}
            alt={order.product.title}
            className="h-16 w-16 flex-shrink-0 rounded-[14px] object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[14px] bg-white/6 text-2xl">📦</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="font-semibold text-white">{order.product?.title || `คำสั่งซื้อ ${order.id.slice(-8).toUpperCase()}`}</h2>
            <span className={`status-chip shrink-0 ${statusChipStyle(order.status)}`}>
              {statusLabel(order.status)}
            </span>
          </div>
          <p className="mt-1 text-xs text-white/40">
            รหัส: <span className="font-mono">{order.id.slice(-10).toUpperCase()}</span>
            {order.createdAt && <span className="ml-2">{formatDateTime(order.createdAt)}</span>}
          </p>
          <p className="mt-1 text-xl font-bold text-white">{formatCurrency(order.amount)}</p>
        </div>
      </div>

      {/* Timeline */}
      {order.status !== 'FAILED' && <OrderTimeline status={order.status} />}

      {/* Info grid */}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {/* Payment info */}
        {order.status === 'AWAITING_VERIFICATION' && (
          <div className="rounded-[14px] border border-sky-300/20 bg-sky-300/8 p-3">
            <p className="text-xs text-sky-300/60">สถานะการชำระเงิน</p>
            <p className="mt-1 text-sm font-medium text-sky-200">รอ Admin ตรวจสอบหลักฐาน</p>
            {order.payment?.slipNote && (
              <p className="mt-1 text-xs text-sky-200/60">หมายเหตุ: {order.payment.slipNote}</p>
            )}
          </div>
        )}
        {order.status === 'FAILED' && order.payment?.rejectedReason && (
          <div className="rounded-[14px] border border-rose-400/20 bg-rose-400/8 p-3">
            <p className="text-xs text-rose-300/60">เหตุผลที่ไม่อนุมัติ</p>
            <p className="mt-1 text-sm text-rose-200">{order.payment.rejectedReason}</p>
          </div>
        )}
        {/* Shipment info */}
        {order.shipment && (
          <div className="rounded-[14px] border border-white/8 bg-white/4 p-3">
            <p className="text-xs text-white/40">การจัดส่ง</p>
            <p className="mt-1 font-mono text-sm font-semibold text-white">{order.shipment.trackingNumber}</p>
            <p className="mt-0.5 text-xs text-white/50">{shipmentStatusLabel(order.shipment.status)}</p>
          </div>
        )}
        {(order.status === 'PAID' || order.status === 'SHIPPED') && !order.shipment && (
          <div className="rounded-[14px] border border-white/8 bg-white/4 p-3">
            <p className="text-xs text-white/40">การจัดส่ง</p>
            <p className="mt-1 text-sm text-white/50">รอ Admin จัดส่ง</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/8 pt-4">
        {(order.status === 'PENDING' || order.status === 'FAILED') && (
          <Link
            href="/payment"
            className="rounded-[12px] border border-amber-300/30 bg-amber-300/12 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-300/20"
          >
            💳 {order.status === 'FAILED' ? 'ส่งหลักฐานใหม่' : 'ชำระเงิน'}
          </Link>
        )}
        {(order.status === 'SHIPPED' || order.status === 'DELIVERED') && order.shipment && (
          <Link
            href={`/tracking?q=${encodeURIComponent(order.shipment.trackingNumber)}`}
            className="rounded-[12px] border border-sky-300/30 bg-sky-300/10 px-4 py-2 text-sm font-medium text-sky-200 hover:bg-sky-300/16"
          >
            🔍 ติดตามพัสดุ
          </Link>
        )}
        {order.auction && (
          <Link
            href={`/auction/${order.auction.id}`}
            className="rounded-[12px] border border-white/12 px-4 py-2 text-sm text-white/55 hover:bg-white/8"
          >
            ดูหน้าประมูล
          </Link>
        )}
      </div>
    </article>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('ALL');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = (await apiGet('/orders')) as OrderRecord[];
        setOrders(data);
        setError('');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'โหลดคำสั่งซื้อไม่สำเร็จ');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filtered = activeTab === 'ALL' ? orders : orders.filter((o) => o.status === activeTab);

  // count badges
  const counts: Record<string, number> = {};
  for (const o of orders) counts[o.status] = (counts[o.status] ?? 0) + 1;

  return (
    <main className="page-bg min-h-screen">
      <Navbar />
      <section className="section-shell py-10 lg:py-14">
        <div className="mb-8">
          <span className="status-chip border-sky-300/24 bg-sky-300/10 text-sky-100">คำสั่งซื้อ</span>
          <h1 className="mt-4 text-4xl font-bold text-white">คำสั่งซื้อของฉัน</h1>
          <p className="soft-copy mt-2 max-w-xl">
            ดูสถานะการชำระเงิน การจัดส่ง และติดตามพัสดุได้จากหน้านี้
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {FILTER_TABS.map((tab) => {
            const count = tab.value === 'ALL' ? orders.length : (counts[tab.value] ?? 0);
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-1.5 rounded-[14px] border px-4 py-2 text-sm transition ${activeTab === tab.value ? 'border-white/20 bg-white/12 text-white' : 'border-white/8 bg-white/4 text-white/50 hover:bg-white/8'}`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${activeTab === tab.value ? 'bg-white/15 text-white/80' : 'bg-white/8 text-white/35'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-panel rounded-[28px] p-5 space-y-3">
                <div className="flex gap-4">
                  <Skeleton className="h-16 w-16 rounded-[14px]" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-6 w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="rounded-[18px] border border-rose-400/20 bg-rose-400/8 p-4 text-sm text-rose-200">{error}</div>
        )}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <EmptyState
            title={activeTab === 'ALL' ? 'ยังไม่มีคำสั่งซื้อ' : `ไม่มีออเดอร์สถานะ "${FILTER_TABS.find(t=>t.value===activeTab)?.label}"`}
            description={activeTab === 'ALL' ? 'เมื่อคุณชนะการประมูล รายการจะปรากฏที่นี่' : ''}
          />
        )}

        {/* Orders */}
        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-4">
            {filtered.map((order) => <OrderCard key={order.id} order={order} />)}
          </div>
        )}
      </section>
    </main>
  );
}
