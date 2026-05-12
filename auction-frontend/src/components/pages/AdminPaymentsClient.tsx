'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { formatCurrency, formatDateTime, translateStatus } from '@/lib/display';
import { AdminPaymentRecord, AdminPaymentsResponse } from '@/lib/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/providers/AppProviders';

const METHOD_ICON: Record<string, string> = {
  promptpay: '🟣',
  bank: '🏦',
  card: '💳',
};

const STATUS_TABS = [
  { value: 'AWAITING_VERIFICATION', label: 'รอตรวจสอบ' },
  { value: 'PAID', label: 'อนุมัติแล้ว' },
  { value: 'FAILED', label: 'ปฏิเสธแล้ว' },
  { value: 'ALL', label: 'ทั้งหมด' },
];

function statusStyle(status: string) {
  switch (status) {
    case 'AWAITING_VERIFICATION': return 'border-amber-300/30 bg-amber-300/12 text-amber-200';
    case 'PAID': return 'border-emerald-400/30 bg-emerald-400/12 text-emerald-200';
    case 'FAILED': return 'border-rose-400/30 bg-rose-400/12 text-rose-200';
    default: return 'border-white/15 bg-white/8 text-white/60';
  }
}

function PaymentCard({ item, onRefresh }: { item: AdminPaymentRecord; onRefresh: () => void }) {
  const { pushToast } = useToast();
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const approve = async () => {
    try {
      setBusy('approve');
      await apiPost(`/admin/payments/${item.id}/approve`, {});
      pushToast({ tone: 'success', title: 'อนุมัติแล้ว', description: `ออเดอร์ของ ${item.buyer?.name ?? '-'} เปลี่ยนเป็น "ชำระแล้ว"` });
      onRefresh();
    } catch (e) {
      pushToast({ tone: 'error', title: 'อนุมัติไม่สำเร็จ', description: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' });
    } finally {
      setBusy(null);
    }
  };

  const reject = async () => {
    try {
      setBusy('reject');
      await apiPost(`/admin/payments/${item.id}/reject`, { reason: rejectReason });
      pushToast({ tone: 'info', title: 'ปฏิเสธแล้ว', description: 'ผู้ซื้อสามารถส่งหลักฐานใหม่ได้' });
      onRefresh();
    } catch (e) {
      pushToast({ tone: 'error', title: 'ปฏิเสธไม่สำเร็จ', description: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' });
    } finally {
      setBusy(null);
      setShowRejectForm(false);
    }
  };

  const isPending = item.status === 'AWAITING_VERIFICATION';

  return (
    <article className="glass-panel rounded-[24px] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        {/* Product + buyer */}
        <div className="flex items-start gap-3">
          {item.product?.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.product.images[0]} alt={item.product.title}
              className="h-16 w-16 flex-shrink-0 rounded-[14px] object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-[14px] border border-white/8 bg-white/4 text-2xl">📦</div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-white">{item.product?.title ?? 'ไม่ทราบสินค้า'}</h2>
              <span className={`status-chip shrink-0 ${statusStyle(item.status)}`}>
                {translateStatus(item.status)}
              </span>
            </div>
            <p className="mt-1 text-xs text-white/50">
              {item.buyer?.name ?? '-'}
              <span className="mx-1.5 text-white/20">·</span>
              {item.buyer?.email ?? '-'}
            </p>
            {item.buyer?.phone && (
              <p className="text-xs text-white/40">{item.buyer.phone}</p>
            )}
          </div>
        </div>

        {/* Amount + method */}
        <div className="flex flex-col items-start gap-1 sm:items-end">
          <p className="text-2xl font-bold text-white">{formatCurrency(item.amount)}</p>
          <div className="flex items-center gap-1.5 text-sm text-white/50">
            <span>{METHOD_ICON[item.provider] ?? '💰'}</span>
            <span>{item.provider === 'promptpay' ? 'PromptPay' : item.provider === 'bank' ? 'โอนธนาคาร' : item.provider === 'card' ? 'บัตรเครดิต' : item.provider}</span>
          </div>
          {item.createdAt && (
            <p className="text-xs text-white/35">{formatDateTime(item.createdAt)}</p>
          )}
        </div>
      </div>

      {/* Slip note */}
      {item.slipNote && (
        <div className="mt-4 rounded-[14px] border border-white/8 bg-white/4 px-4 py-3">
          <p className="text-xs text-white/40">หมายเหตุจากผู้ชำระ</p>
          <p className="mt-1 text-sm text-white">{item.slipNote}</p>
        </div>
      )}

      {/* Reject reason (if rejected) */}
      {item.status === 'FAILED' && item.rejectedReason && (
        <div className="mt-4 rounded-[14px] border border-rose-400/20 bg-rose-400/8 px-4 py-3">
          <p className="text-xs text-rose-300/60">เหตุผลที่ปฏิเสธ</p>
          <p className="mt-1 text-sm text-rose-200">{item.rejectedReason}</p>
        </div>
      )}

      {/* Actions */}
      {isPending && (
        <div className="mt-4 border-t border-white/8 pt-4">
          {showRejectForm ? (
            <div className="space-y-2">
              <input
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="ระบุเหตุผล เช่น ยอดไม่ตรง, สลิปไม่ชัด (ไม่บังคับ)"
                className="field text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => void reject()}
                  disabled={busy !== null}
                  className="flex-1 rounded-[12px] border border-rose-400/30 bg-rose-400/12 px-4 py-2 text-sm font-medium text-rose-200 hover:bg-rose-400/20 disabled:opacity-40"
                >
                  {busy === 'reject' ? 'กำลังปฏิเสธ...' : 'ยืนยันปฏิเสธ'}
                </button>
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="rounded-[12px] border border-white/10 px-4 py-2 text-sm text-white/50 hover:bg-white/6"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setShowRejectForm(true)}
                disabled={busy !== null}
                className="flex-1 rounded-[12px] border border-rose-400/25 bg-rose-400/8 px-4 py-2.5 text-sm font-medium text-rose-300 hover:bg-rose-400/16 disabled:opacity-40"
              >
                ✕ ปฏิเสธ
              </button>
              <button
                onClick={() => void approve()}
                disabled={busy !== null}
                className="flex-1 rounded-[12px] border border-emerald-400/30 bg-emerald-400/12 px-4 py-2.5 text-sm font-medium text-emerald-200 hover:bg-emerald-400/20 disabled:opacity-40"
              >
                {busy === 'approve' ? 'กำลังอนุมัติ...' : '✓ อนุมัติชำระเงิน'}
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

export default function AdminPaymentsClient() {
  const [activeTab, setActiveTab] = useState('AWAITING_VERIFICATION');
  const [data, setData] = useState<AdminPaymentsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (status: string) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ status, limit: '30' });
      const res = (await apiGet(`/admin/payments?${qs}`)) as AdminPaymentsResponse;
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(activeTab); }, [activeTab]);

  const items = data?.items ?? [];

  return (
    <section className="section-shell py-10 lg:py-14">
      <div className="mb-8">
        <span className="status-chip border-emerald-400/30 bg-emerald-400/10 text-emerald-200">Admin</span>
        <h1 className="mt-4 text-4xl font-bold text-white">ตรวจสอบการชำระเงิน</h1>
        <p className="soft-copy mt-2 max-w-xl">
          ตรวจสอบหลักฐานที่ผู้ซื้อส่งมา อนุมัติเพื่อดำเนินการจัดส่ง หรือปฏิเสธเพื่อให้ผู้ซื้อส่งใหม่
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <button key={tab.value} onClick={() => setActiveTab(tab.value)}
            className={`rounded-[14px] border px-4 py-2 text-sm transition ${activeTab === tab.value ? 'border-white/20 bg-white/12 text-white' : 'border-white/8 bg-white/4 text-white/50 hover:bg-white/8'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass-panel rounded-[24px] p-5 space-y-3">
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
          title={activeTab === 'AWAITING_VERIFICATION' ? 'ไม่มีรายการรอตรวจสอบ' : 'ไม่พบรายการ'}
          description={activeTab === 'AWAITING_VERIFICATION' ? 'เมื่อผู้ซื้อส่งหลักฐานชำระเงิน รายการจะปรากฏที่นี่' : 'ลองเปลี่ยนแท็บดูครับ'}
        />
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-4">
          {items.map((item) => (
            <PaymentCard key={item.id} item={item} onRefresh={() => void load(activeTab)} />
          ))}
        </div>
      )}

      {data && data.pagination.total > items.length && (
        <p className="mt-6 text-center text-sm text-white/40">
          แสดง {items.length} จาก {data.pagination.total} รายการ
        </p>
      )}
    </section>
  );
}
