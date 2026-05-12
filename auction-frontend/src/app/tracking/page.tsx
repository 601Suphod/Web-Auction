'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { apiGet } from '@/lib/api';
import { TrackingResult } from '@/lib/types';
import { formatDateTime } from '@/lib/display';

const STEPS = [
  { key: 'PENDING', label: 'รอชำระเงิน', icon: '💳', desc: 'ระบบสร้างคำสั่งซื้อแล้ว' },
  { key: 'PAID', label: 'ชำระเงินแล้ว', icon: '✅', desc: 'ได้รับการชำระเงินเรียบร้อย' },
  { key: 'IN_TRANSIT', label: 'กำลังขนส่ง', icon: '🚚', desc: 'พัสดุอยู่ระหว่างการจัดส่ง' },
  { key: 'DELIVERED', label: 'ส่งถึงแล้ว', icon: '📦', desc: 'พัสดุถึงปลายทางเรียบร้อย' },
];

function getStepIndex(orderStatus: string | undefined, shipmentStatus: string | undefined): number {
  if (shipmentStatus === 'DELIVERED' || orderStatus === 'DELIVERED') return 3;
  if (shipmentStatus === 'IN_TRANSIT' || orderStatus === 'SHIPPED') return 2;
  if (orderStatus === 'PAID') return 1;
  return 0;
}

function Timeline({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="relative mt-6">
      {/* connector line */}
      <div className="absolute left-5 top-5 h-[calc(100%-2.5rem)] w-0.5 bg-white/10" />
      <div
        className="absolute left-5 top-5 w-0.5 bg-emerald-400/60 transition-all duration-700"
        style={{ height: `${(activeIndex / (STEPS.length - 1)) * 100}%` }}
      />
      <ol className="space-y-4">
        {STEPS.map((step, i) => {
          const done = i <= activeIndex;
          const active = i === activeIndex;
          return (
            <li key={step.key} className="relative flex items-start gap-4 pl-12">
              <div className={`absolute left-0 flex h-10 w-10 items-center justify-center rounded-full border-2 text-lg transition-all ${done ? 'border-emerald-400 bg-emerald-400/20' : 'border-white/15 bg-white/4'} ${active ? 'shadow-[0_0_16px_rgba(52,211,153,0.4)]' : ''}`}>
                {step.icon}
              </div>
              <div className={`min-w-0 flex-1 rounded-[16px] border p-3.5 transition-all ${active ? 'border-emerald-400/30 bg-emerald-400/8' : done ? 'border-white/10 bg-white/4' : 'border-white/6 bg-white/2 opacity-40'}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className={`font-medium ${done ? 'text-white' : 'text-white/50'}`}>{step.label}</p>
                  {active && (
                    <span className="rounded-full bg-emerald-400/20 px-2 py-0.5 text-xs text-emerald-300">ปัจจุบัน</span>
                  )}
                </div>
                <p className={`mt-0.5 text-xs ${done ? 'text-white/55' : 'text-white/30'}`}>{step.desc}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function TrackingPage() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // auto-search if ?q= was provided in URL
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) void search(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const search = async (overrideQuery?: string) => {
    const q = overrideQuery ?? query;
    if (!q.trim()) return;
    if (!query.trim()) return;
    try {
      setLoading(true);
      setError('');
      const data = (await apiGet(`/tracking/${encodeURIComponent(q.trim())}`)) as TrackingResult;
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ไม่พบข้อมูลการจัดส่ง');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const activeIndex = result
    ? getStepIndex(result.order?.status, result.shipment?.status)
    : -1;

  return (
    <main className="page-bg min-h-screen">
      <Navbar />
      <section className="section-shell py-10 lg:py-14">
        <div className="mb-8">
          <span className="status-chip border-sky-300/24 bg-sky-300/10 text-sky-100">ติดตามสินค้า</span>
          <h1 className="mt-4 text-4xl font-bold text-white">ติดตามสถานะการจัดส่ง</h1>
          <p className="soft-copy mt-2 max-w-xl">
            ค้นหาด้วยรหัสคำสั่งซื้อ (Order ID) หรือเลขพัสดุ เพื่อดูสถานะล่าสุดแบบเรียลไทม์
          </p>
        </div>

        <div className="mx-auto max-w-2xl">
          {/* Search */}
          <div className="glass-panel rounded-[24px] p-5">
            <label className="mb-1.5 block text-sm font-medium text-white/70">รหัสคำสั่งซื้อหรือเลขพัสดุ</label>
            <div className="flex gap-2">
              <input
                className="field flex-1"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void search(undefined)}
                placeholder="เช่น EF123456789TH หรือ Order ID"
              />
              <button
                onClick={() => void search(undefined)}
                disabled={loading || !query.trim()}
                className="primary-btn px-5 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? '...' : 'ค้นหา'}
              </button>
            </div>
            {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
          </div>

          {/* Result */}
          {result && (
            <div className="mt-6 space-y-4">
              {/* Product card */}
              {result.product && (
                <div className="glass-panel flex items-center gap-4 rounded-[24px] p-5">
                  {result.product.images?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={result.product.images[0]}
                      alt={result.product.title}
                      className="h-16 w-16 flex-shrink-0 rounded-[14px] object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs uppercase tracking-[0.15em] text-white/40">สินค้า</p>
                    <p className="mt-0.5 font-semibold text-white truncate">{result.product.title}</p>
                  </div>
                </div>
              )}

              {/* Info cards */}
              <div className="glass-panel rounded-[24px] p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[16px] border border-white/8 bg-white/4 p-3.5">
                    <p className="text-xs text-white/50">เลขพัสดุ</p>
                    <p className="mt-1 font-mono font-semibold text-white">{result.shipment.trackingNumber}</p>
                  </div>
                  <div className="rounded-[16px] border border-white/8 bg-white/4 p-3.5">
                    <p className="text-xs text-white/50">อัปเดตล่าสุด</p>
                    <p className="mt-1 font-medium text-white">{formatDateTime(result.shipment.updatedAt)}</p>
                  </div>
                </div>

                {/* Timeline */}
                <Timeline activeIndex={activeIndex} />
              </div>
            </div>
          )}

          {/* Placeholder when no search */}
          {!result && !error && (
            <div className="mt-6 glass-panel rounded-[24px] p-10 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/6 text-3xl">
                🔍
              </div>
              <p className="mt-4 font-medium text-white/60">ยังไม่มีข้อมูลที่แสดง</p>
              <p className="mt-1 text-sm text-white/35">ใส่รหัสคำสั่งซื้อหรือเลขพัสดุแล้วกดค้นหา</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
