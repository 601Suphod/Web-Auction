'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { formatCurrency, formatDateTime, translateStatus } from '@/lib/display';
import { AdminProductsResponse, Product } from '@/lib/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/providers/AppProviders';

type QueryState = { q: string; status: string; sort: string; page: string };

function statusChip(status: string) {
  switch (status) {
    case 'PENDING':
      return 'border-amber-300/30 bg-amber-300/12 text-amber-200';
    case 'APPROVED':
      return 'border-emerald-400/30 bg-emerald-400/12 text-emerald-200';
    case 'REJECTED':
      return 'border-rose-400/30 bg-rose-400/12 text-rose-200';
    default:
      return 'border-white/15 bg-white/8 text-white/60';
  }
}

function parseDescription(raw: string) {
  const categoryMatch = raw.match(/^\[([^\]]+)\]/);
  const conditionMatch = raw.match(/สภาพ: ([^\n]+)/);
  const body = raw
    .replace(/^\[[^\]]+\]\s*/, '')
    .replace(/สภาพ: [^\n]+\n?/, '')
    .trim();
  return {
    category: categoryMatch?.[1] ?? null,
    condition: conditionMatch?.[1] ?? null,
    body,
  };
}

function ProductCard({
  item,
  busyAction,
  onModerate,
}: {
  item: Product;
  busyAction: string | null;
  onModerate: (product: Product, action: 'approve' | 'reject') => void;
}) {
  const approving = busyAction === `approve:${item.id}`;
  const rejecting = busyAction === `reject:${item.id}`;
  const busy = !!busyAction;
  const { category, condition, body } = parseDescription(item.description || '');
  const image = item.images?.[0];

  return (
    <article className="glass-panel rounded-[24px] p-5">
      <div className="flex gap-4">
        {/* thumbnail */}
        <div className="flex-shrink-0">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image}
              alt={item.title}
              className="h-24 w-24 rounded-[16px] object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-[16px] border border-white/8 bg-white/4 text-3xl text-white/20">
              📦
            </div>
          )}
        </div>

        {/* info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="text-base font-semibold leading-snug text-white">{item.title}</h2>
            <span className={`status-chip shrink-0 ${statusChip(item.status)}`}>
              {translateStatus(item.status)}
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap gap-2">
            {category && (
              <span className="rounded-lg border border-white/10 bg-white/6 px-2 py-0.5 text-xs text-white/55">
                {category}
              </span>
            )}
            {condition && (
              <span className="rounded-lg border border-white/10 bg-white/6 px-2 py-0.5 text-xs text-white/55">
                {condition}
              </span>
            )}
          </div>

          {body && (
            <p className="mt-2 line-clamp-2 text-xs text-white/45 leading-relaxed">{body}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/40">
            <span>ราคาเริ่มต้น <span className="text-white/70">{formatCurrency(item.startPrice ?? 0)}</span></span>
            {item.createdAt && <span>ลงขายเมื่อ {formatDateTime(item.createdAt)}</span>}
          </div>
        </div>
      </div>

      {/* actions */}
      <div className="mt-4 flex items-center justify-end gap-2 border-t border-white/6 pt-4">
        {item.status === 'APPROVED' && (
          <p className="mr-auto text-xs text-emerald-300/70">อนุมัติแล้ว — ระบบเปิดประมูลให้อัตโนมัติ</p>
        )}
        {item.status === 'REJECTED' && (
          <p className="mr-auto text-xs text-rose-300/70">ถูกปฏิเสธ — ผู้ขายจะเห็นสถานะนี้</p>
        )}

        <button
          onClick={() => onModerate(item, 'reject')}
          disabled={busy || item.status === 'REJECTED'}
          className="rounded-[12px] border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-xs font-medium text-rose-200 transition hover:bg-rose-400/18 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {rejecting ? 'กำลังดำเนินการ...' : '✕ ปฏิเสธ'}
        </button>
        <button
          onClick={() => onModerate(item, 'approve')}
          disabled={busy || item.status === 'APPROVED'}
          className="rounded-[12px] border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-xs font-medium text-emerald-200 transition hover:bg-emerald-400/18 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {approving ? 'กำลังดำเนินการ...' : '✓ อนุมัติ'}
        </button>
      </div>
    </article>
  );
}

export default function AdminProductsClient() {
  const { pushToast } = useToast();
  const [query, setQuery] = useState<QueryState>(() => {
    if (typeof window === 'undefined') return { q: '', status: 'PENDING', sort: 'latest', page: '1' };
    const p = new URLSearchParams(window.location.search);
    return {
      q: p.get('q') || '',
      status: p.get('status') || 'PENDING',
      sort: p.get('sort') || 'latest',
      page: p.get('page') || '1',
    };
  });
  const [data, setData] = useState<AdminProductsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  const fetchData = async (q: QueryState) => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({
        ...(q.q ? { q: q.q } : {}),
        status: q.status,
        sort: q.sort,
        page: q.page,
        limit: '10',
      });
      const next = (await apiGet(`/admin/products?${qs.toString()}`)) as AdminProductsResponse;
      setData(next);

      // always refresh pending count
      if (q.status !== 'PENDING') {
        const countRes = (await apiGet('/admin/products?status=PENDING&limit=1')) as AdminProductsResponse;
        setPendingCount(countRes.pagination.total);
      } else {
        setPendingCount(next.pagination.total);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchData(query); }, [query]); // eslint-disable-line react-hooks/exhaustive-deps

  const moderate = async (product: Product, action: 'approve' | 'reject') => {
    const key = `${action}:${product.id}`;
    setBusyAction(key);
    try {
      await apiPost(`/moderation/products/${product.id}`, { action });
      pushToast({
        tone: 'success',
        title: action === 'approve' ? 'อนุมัติสินค้าแล้ว' : 'ปฏิเสธสินค้าแล้ว',
        description: `"${product.title}" ${action === 'approve' ? 'ถูกอนุมัติและเปิดประมูลอัตโนมัติแล้ว' : 'ถูกปฏิเสธแล้ว'}`,
      });
      await fetchData(query);
    } catch (error) {
      pushToast({
        tone: 'error',
        title: 'ทำรายการไม่สำเร็จ',
        description: error instanceof Error ? error.message : 'โปรดลองอีกครั้ง',
      });
    } finally {
      setBusyAction(null);
    }
  };

  const applyQuery = (partial: Partial<QueryState>) => {
    const next = { ...query, ...partial, page: partial.page ?? '1' };
    const qs = new URLSearchParams({
      ...(next.q ? { q: next.q } : {}),
      status: next.status,
      sort: next.sort,
      page: next.page,
    }).toString();
    window.history.replaceState(null, '', `/admin/products?${qs}`);
    setQuery(next);
  };

  const items = data?.items ?? [];
  const pagination = data?.pagination;

  return (
    <section className="section-shell py-10 lg:py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="status-chip border-purple-400/30 bg-purple-400/10 text-purple-200">
            Admin
          </span>
          <h1 className="mt-4 text-4xl font-bold text-white">อนุมัติสินค้า</h1>
          <p className="soft-copy mt-2 max-w-xl">
            ตรวจสอบสินค้าที่ผู้ขายส่งมา แล้วอนุมัติหรือปฏิเสธ เมื่ออนุมัติ ระบบจะเปิดประมูล 7 วันอัตโนมัติ
          </p>
        </div>
        {pendingCount !== null && pendingCount > 0 && (
          <button
            onClick={() => applyQuery({ status: 'PENDING' })}
            className="flex items-center gap-2 rounded-[14px] border border-amber-300/30 bg-amber-300/10 px-4 py-2.5 text-sm text-amber-200 hover:bg-amber-300/16"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-400/25 text-xs font-bold text-amber-200">
              {pendingCount}
            </span>
            รอการอนุมัติ
          </button>
        )}
      </div>

      {/* filters */}
      <div className="glass-panel mb-6 rounded-[22px] p-4">
        <div className="flex flex-wrap gap-3">
          <input
            className="field flex-1 min-w-[180px]"
            placeholder="ค้นหาชื่อสินค้า..."
            defaultValue={query.q}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyQuery({ q: (e.target as HTMLInputElement).value });
            }}
            onBlur={(e) => applyQuery({ q: e.target.value })}
          />
          <select
            className="field"
            value={query.status}
            onChange={(e) => applyQuery({ status: e.target.value })}
          >
            <option value="ALL">ทั้งหมด</option>
            <option value="PENDING">รออนุมัติ</option>
            <option value="APPROVED">อนุมัติแล้ว</option>
            <option value="REJECTED">ถูกปฏิเสธ</option>
          </select>
          <select
            className="field"
            value={query.sort}
            onChange={(e) => applyQuery({ sort: e.target.value })}
          >
            <option value="latest">ล่าสุดก่อน</option>
            <option value="oldest">เก่าสุดก่อน</option>
            <option value="price_desc">ราคาสูง → ต่ำ</option>
            <option value="price_asc">ราคาต่ำ → สูง</option>
          </select>
        </div>
      </div>

      {/* loading skeletons */}
      {loading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-panel rounded-[24px] p-5">
              <div className="flex gap-4">
                <Skeleton className="h-24 w-24 rounded-[16px]" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* empty */}
      {!loading && items.length === 0 && (
        <EmptyState
          title={query.status === 'PENDING' ? 'ไม่มีสินค้าที่รออนุมัติ' : 'ไม่พบสินค้า'}
          description={
            query.status === 'PENDING'
              ? 'ยังไม่มีผู้ขายส่งสินค้ามาในขณะนี้'
              : 'ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ'
          }
        />
      )}

      {/* cards */}
      {!loading && items.length > 0 && (
        <div className="space-y-4">
          {items.map((item) => (
            <ProductCard
              key={item.id}
              item={item}
              busyAction={busyAction}
              onModerate={moderate}
            />
          ))}
        </div>
      )}

      {/* pagination */}
      {!loading && pagination && pagination.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            className="secondary-btn px-5 py-2.5 text-sm disabled:opacity-40"
            disabled={!pagination.hasPrev}
            onClick={() => applyQuery({ page: String(pagination.page - 1) })}
          >
            ← ก่อนหน้า
          </button>
          <p className="text-sm text-white/60">
            หน้า {pagination.page} / {pagination.totalPages}
            <span className="ml-2 text-white/35">({pagination.total} รายการ)</span>
          </p>
          <button
            className="secondary-btn px-5 py-2.5 text-sm disabled:opacity-40"
            disabled={!pagination.hasNext}
            onClick={() => applyQuery({ page: String(pagination.page + 1) })}
          >
            ถัดไป →
          </button>
        </div>
      )}
    </section>
  );
}
