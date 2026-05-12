'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut } from '@/lib/api';
import { formatCurrency, formatDateTime, translateStatus } from '@/lib/display';
import { AdminOrderRecord, AdminOrdersResponse } from '@/lib/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/providers/AppProviders';

const STATUS_TABS = [
  { value: 'PAID', label: 'รอจัดส่ง', color: 'text-amber-200' },
  { value: 'SHIPPED', label: 'กำลังขนส่ง', color: 'text-sky-200' },
  { value: 'DELIVERED', label: 'ส่งถึงแล้ว', color: 'text-emerald-200' },
  { value: 'ALL', label: 'ทั้งหมด', color: 'text-white/70' },
];

function statusChip(status: string) {
  switch (status) {
    case 'PENDING': return 'border-white/15 bg-white/8 text-white/60';
    case 'PAID': return 'border-amber-300/30 bg-amber-300/12 text-amber-200';
    case 'SHIPPED': return 'border-sky-400/30 bg-sky-400/12 text-sky-200';
    case 'DELIVERED': return 'border-emerald-400/30 bg-emerald-400/12 text-emerald-200';
    default: return 'border-white/15 bg-white/8 text-white/60';
  }
}

function ShipForm({ order, onShipped }: { order: AdminOrderRecord; onShipped: () => void }) {
  const { pushToast } = useToast();
  const [trackingNumber, setTrackingNumber] = useState('');
  const [busy, setBusy] = useState(false);

  const ship = async () => {
    if (!trackingNumber.trim()) return;
    try {
      setBusy(true);
      await apiPost('/shipping', { orderId: order.id, trackingNumber: trackingNumber.trim() });
      pushToast({
        tone: 'success',
        title: 'จัดส่งสำเร็จ',
        description: `เลขพัสดุ ${trackingNumber} ถูกบันทึกแล้ว`,
      });
      onShipped();
    } catch (e) {
      pushToast({
        tone: 'error',
        title: 'จัดส่งไม่สำเร็จ',
        description: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 flex gap-2 border-t border-white/8 pt-4">
      <input
        value={trackingNumber}
        onChange={(e) => setTrackingNumber(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void ship()}
        placeholder="เลขพัสดุ เช่น EF123456789TH"
        className="field flex-1 text-sm"
      />
      <button
        onClick={() => void ship()}
        disabled={busy || !trackingNumber.trim()}
        className="rounded-[12px] border border-sky-400/30 bg-sky-400/12 px-4 py-2 text-xs font-medium text-sky-200 hover:bg-sky-400/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? '...' : '🚚 จัดส่ง'}
      </button>
    </div>
  );
}

function DeliverButton({ order, onDelivered }: { order: AdminOrderRecord; onDelivered: () => void }) {
  const { pushToast } = useToast();
  const [busy, setBusy] = useState(false);

  const deliver = async () => {
    try {
      setBusy(true);
      await apiPut(`/shipping/${order.id}`, { status: 'DELIVERED' });
      pushToast({
        tone: 'success',
        title: 'อัปเดตสถานะสำเร็จ',
        description: 'สถานะพัสดุเปลี่ยนเป็น "ส่งถึงแล้ว"',
      });
      onDelivered();
    } catch (e) {
      pushToast({
        tone: 'error',
        title: 'อัปเดตสถานะไม่สำเร็จ',
        description: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-4">
      {order.shipment && (
        <div className="flex items-center gap-2 text-xs text-white/45">
          <span>📦</span>
          <span className="font-mono">{order.shipment.trackingNumber}</span>
        </div>
      )}
      <button
        onClick={() => void deliver()}
        disabled={busy}
        className="ml-auto rounded-[12px] border border-emerald-400/30 bg-emerald-400/12 px-4 py-2 text-xs font-medium text-emerald-200 hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? '...' : '✓ ส่งถึงแล้ว'}
      </button>
    </div>
  );
}

function OrderRow({ item, onRefresh }: { item: AdminOrderRecord; onRefresh: () => void }) {
  return (
    <article className="glass-panel rounded-[24px] p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          {item.product?.images?.[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.product.images[0]}
              alt={item.product.title ?? ''}
              className="h-16 w-16 flex-shrink-0 rounded-[14px] object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-white">{item.product?.title || `Order ${item.id.slice(-6)}`}</h2>
              <span className={`status-chip shrink-0 ${statusChip(item.status)}`}>
                {translateStatus(item.status)}
              </span>
            </div>
            <p className="mt-1 text-xs text-white/45">
              ผู้ซื้อ: <span className="text-white/70">{item.buyer?.name ?? '-'}</span>
              <span className="mx-1.5 text-white/20">·</span>
              <span className="font-mono text-white/50">{item.id.slice(-8).toUpperCase()}</span>
            </p>
            {item.createdAt && (
              <p className="mt-0.5 text-xs text-white/35">{formatDateTime(item.createdAt)}</p>
            )}
          </div>
        </div>
        <p className="shrink-0 text-xl font-bold text-white">{formatCurrency(item.amount)}</p>
      </div>

      {item.status === 'PAID' && <ShipForm order={item} onShipped={onRefresh} />}
      {item.status === 'SHIPPED' && <DeliverButton order={item} onDelivered={onRefresh} />}
      {item.status === 'DELIVERED' && (
        <div className="mt-4 flex items-center gap-2 border-t border-white/8 pt-3 text-xs text-emerald-300/70">
          <span>✓</span>
          <span>ส่งถึงผู้รับเรียบร้อยแล้ว</span>
          {item.shipment && <span className="font-mono ml-1 text-white/40">{item.shipment.trackingNumber}</span>}
        </div>
      )}
    </article>
  );
}

export default function AdminOrdersClient() {
  const [activeTab, setActiveTab] = useState('PAID');
  const [data, setData] = useState<AdminOrdersResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (status: string) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ status, limit: '20' });
      const res = (await apiGet(`/admin/orders?${qs}`)) as AdminOrdersResponse;
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(activeTab); }, [activeTab]);

  const items = data?.items ?? [];
  const pagination = data?.pagination;

  return (
    <section className="section-shell py-10 lg:py-14">
      <div className="mb-8">
        <span className="status-chip border-sky-400/30 bg-sky-400/10 text-sky-200">Admin</span>
        <h1 className="mt-4 text-4xl font-bold text-white">จัดการคำสั่งซื้อ</h1>
        <p className="soft-copy mt-2 max-w-xl">
          ดูรายการที่ชำระเงินแล้ว ใส่เลขพัสดุ และอัปเดตสถานะการจัดส่ง
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`rounded-[14px] border px-4 py-2 text-sm transition ${activeTab === tab.value ? 'border-white/20 bg-white/12 text-white' : 'border-white/8 bg-white/4 text-white/50 hover:bg-white/8'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-panel rounded-[24px] p-5">
              <div className="flex gap-3">
                <Skeleton className="h-16 w-16 rounded-[14px]" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && items.length === 0 && (
        <EmptyState
          title={activeTab === 'PAID' ? 'ไม่มีรายการรอจัดส่ง' : 'ไม่พบรายการ'}
          description={activeTab === 'PAID' ? 'เมื่อผู้ชนะชำระเงินแล้ว รายการจะปรากฏที่นี่' : 'ลองเปลี่ยนแท็บดูครับ'}
        />
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-4">
          {items.map((item) => (
            <OrderRow key={item.id} item={item} onRefresh={() => void load(activeTab)} />
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <p className="mt-6 text-center text-sm text-white/40">
          แสดง {items.length} จาก {pagination.total} รายการ
        </p>
      )}
    </section>
  );
}
