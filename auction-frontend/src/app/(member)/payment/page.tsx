'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { apiGet, apiPost } from '@/lib/api';
import { useToast } from '@/components/providers/AppProviders';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency, formatDateTime, translateStatus } from '@/lib/display';
import { OrderRecord } from '@/lib/types';

type Method = 'promptpay' | 'bank' | 'card';

const METHOD_LABELS: Record<Method, string> = {
  promptpay: 'PromptPay',
  bank: 'โอนเงินธนาคาร',
  card: 'บัตรเครดิต/เดบิต',
};

function useCountdown(targetMs: number | null) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    if (!targetMs) return;
    const tick = () => setRemaining(Math.max(0, targetMs - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetMs]);
  const h = Math.floor(remaining / 3_600_000);
  const m = Math.floor((remaining % 3_600_000) / 60_000);
  const s = Math.floor((remaining % 60_000) / 1_000);
  return { remaining, h, m, s };
}

function CountdownBadge({ createdAt }: { createdAt?: string }) {
  const deadline = createdAt ? new Date(createdAt).getTime() + 24 * 3_600_000 : null;
  const { remaining, h, m, s } = useCountdown(deadline);
  if (!deadline) return null;
  const urgent = remaining < 3_600_000 && remaining > 0;
  const expired = remaining === 0;
  return (
    <div className={`flex items-center gap-2 rounded-[14px] border px-3 py-2 text-sm ${expired ? 'border-rose-500/40 bg-rose-500/12 text-rose-300' : urgent ? 'border-rose-400/30 bg-rose-400/10 text-rose-200' : 'border-amber-300/25 bg-amber-300/8 text-amber-200'}`}>
      <span>{expired ? '⛔' : urgent ? '⚡' : '⏳'}</span>
      <span>{expired ? 'หมดเวลาแล้ว' : `ชำระภายใน `}
        {!expired && <span className="font-mono font-bold">{String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}</span>}
      </span>
    </div>
  );
}

function MethodSelector({ value, onChange }: { value: Method; onChange: (m: Method) => void }) {
  const opts: { id: Method; icon: string; desc: string }[] = [
    { id: 'promptpay', icon: '🟣', desc: 'สแกน QR จ่ายผ่านแอปธนาคาร' },
    { id: 'bank',      icon: '🏦', desc: 'โอนเข้าบัญชีธนาคาร' },
    { id: 'card',      icon: '💳', desc: 'Visa, Mastercard, JCB' },
  ];
  return (
    <div className="space-y-2">
      {opts.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)}
          className={`w-full rounded-[16px] border p-3.5 text-left transition ${value === o.id ? 'border-emerald-400/50 bg-emerald-400/10' : 'border-white/10 bg-white/4 hover:bg-white/7'}`}>
          <div className="flex items-center gap-3">
            <span className="text-xl">{o.icon}</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{METHOD_LABELS[o.id]}</p>
              <p className="text-xs text-white/45">{o.desc}</p>
            </div>
            <div className={`h-4 w-4 rounded-full border-2 transition ${value === o.id ? 'border-emerald-400 bg-emerald-400' : 'border-white/30'}`} />
          </div>
        </button>
      ))}
    </div>
  );
}

function PaymentDetails({ method, amount }: { method: Method; amount: number }) {
  if (method === 'promptpay') return (
    <div className="mt-4 rounded-[18px] border border-white/8 bg-white/4 p-5 text-center">
      <p className="text-sm text-white/60">สแกน QR Code ด้วยแอปธนาคาร</p>
      <div className="mx-auto mt-4 flex h-36 w-36 items-center justify-center rounded-[14px] bg-white p-2 text-5xl">📱</div>
      <p className="mt-2 text-xs text-white/40">PromptPay · 098-765-4321</p>
      <p className="mt-1 text-lg font-bold text-white">{formatCurrency(amount)}</p>
    </div>
  );
  if (method === 'bank') return (
    <div className="mt-4 space-y-2 rounded-[18px] border border-white/8 bg-white/4 p-4">
      {[
        ['ธนาคาร', 'กสิกรไทย (KBank)'],
        ['ชื่อบัญชี', 'บริษัท AuctionHub จำกัด'],
        ['เลขบัญชี', '123-4-56789-0'],
        ['ยอดโอน', formatCurrency(amount)],
      ].map(([label, val]) => (
        <div key={label} className="flex justify-between rounded-[12px] border border-white/8 bg-white/4 px-3 py-2">
          <span className="text-xs text-white/45">{label}</span>
          <span className="text-sm font-medium text-white">{val}</span>
        </div>
      ))}
    </div>
  );
  return (
    <div className="mt-4 space-y-3 rounded-[18px] border border-white/8 bg-white/4 p-4">
      <input placeholder="1234 5678 9012 3456" className="field" maxLength={19} />
      <div className="grid grid-cols-2 gap-3">
        <input placeholder="MM/YY" className="field" maxLength={5} />
        <input placeholder="CVV" className="field" maxLength={4} />
      </div>
      <input placeholder="ชื่อบนบัตร" className="field" />
    </div>
  );
}

function OrderCard({ order, paying, onPay }: {
  order: OrderRecord; paying: boolean;
  onPay: (id: string, method: Method, slipNote: string) => void;
}) {
  const [method, setMethod] = useState<Method>('bank');
  const [slipNote, setSlipNote] = useState('');

  return (
    <article className="glass-panel rounded-[28px] p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {order.product?.images?.[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={order.product.images[0]} alt={order.product.title}
              className="h-20 w-20 flex-shrink-0 rounded-[16px] object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-white/40">ออเดอร์</p>
            <h2 className="mt-0.5 text-lg font-semibold text-white">
              {order.product?.title || `รายการ ${order.id.slice(-6)}`}
            </h2>
            <p className="mt-0.5 text-xs text-white/40">
              <span className="font-mono text-white/55">{order.id.slice(-8).toUpperCase()}</span>
              {order.createdAt && <span className="ml-2">· {formatDateTime(order.createdAt)}</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <CountdownBadge createdAt={order.createdAt} />
          <p className="text-2xl font-bold text-white">{formatCurrency(order.amount)}</p>
        </div>
      </div>

      <div className="mt-6">
        <p className="mb-2 text-sm font-medium text-white/70">เลือกวิธีชำระเงิน</p>
        <MethodSelector value={method} onChange={setMethod} />
      </div>

      <PaymentDetails method={method} amount={order.amount} />

      <div className="mt-4">
        <label className="mb-1.5 block text-sm font-medium text-white/70">
          เลขอ้างอิง / หมายเหตุการโอน <span className="text-white/35">(ไม่บังคับ)</span>
        </label>
        <input value={slipNote} onChange={(e) => setSlipNote(e.target.value)}
          placeholder="เช่น เลข ref โอนเงิน, เวลาโอน หรือชื่อผู้โอน"
          className="field" />
        <p className="mt-1 text-xs text-white/30">Admin จะใช้ข้อมูลนี้ในการตรวจสอบ</p>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/8 pt-5">
        {order.auction && (
          <Link href={`/auction/${order.auction.id}`} className="text-sm text-white/40 underline underline-offset-4 hover:text-white/70">
            ดูหน้าประมูล
          </Link>
        )}
        <button onClick={() => onPay(order.id, method, slipNote)} disabled={paying}
          className="primary-btn ml-auto px-6 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60">
          {paying ? 'กำลังส่ง...' : `📤 ส่งหลักฐานการชำระเงิน`}
        </button>
      </div>
    </article>
  );
}

function AwaitingCard({ order }: { order: OrderRecord }) {
  return (
    <article className="glass-panel rounded-[28px] border border-amber-300/20 p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-2xl">⏳</div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-white">{order.product?.title || `ออเดอร์ ${order.id.slice(-6)}`}</h2>
            <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2 py-0.5 text-xs text-amber-200">
              {translateStatus(order.status)}
            </span>
          </div>
          <p className="mt-1 text-sm text-white/50">
            Admin กำลังตรวจสอบหลักฐานการชำระเงินของคุณ กรุณารอสักครู่
          </p>
          <p className="mt-0.5 text-xs text-white/35">
            ยอดชำระ <span className="text-white/60">{formatCurrency(order.amount)}</span>
            {order.createdAt && <span className="ml-2">· ส่งเมื่อ {formatDateTime(order.createdAt)}</span>}
          </p>
        </div>
      </div>
    </article>
  );
}

export default function PaymentPage() {
  const { pushToast } = useToast();
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [awaitingOrders, setAwaitingOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      const data = (await apiGet('/orders')) as OrderRecord[];
      setOrders(data.filter((o) => o.status === 'PENDING'));
      setAwaitingOrders(data.filter((o) => o.status === 'AWAITING_VERIFICATION'));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'โหลดรายการชำระเงินไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadOrders(); }, [loadOrders]);

  const pay = async (orderId: string, method: Method, slipNote: string) => {
    try {
      setPaying(orderId);
      await apiPost(`/orders/${orderId}/pay`, { method, slipNote });
      pushToast({
        tone: 'success',
        title: 'ส่งหลักฐานการชำระเงินแล้ว',
        description: 'Admin จะตรวจสอบและยืนยันให้ภายใน 24 ชั่วโมง',
      });
      await loadOrders();
    } catch (e) {
      pushToast({
        tone: 'error',
        title: 'ส่งหลักฐานไม่สำเร็จ',
        description: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด',
      });
    } finally {
      setPaying(null);
    }
  };

  return (
    <main className="page-bg min-h-screen">
      <Navbar />
      <section className="section-shell py-10 lg:py-14">
        <div className="mb-8">
          <span className="status-chip border-amber-300/24 bg-amber-300/10 text-amber-100">ชำระเงิน</span>
          <h1 className="mt-4 text-4xl font-bold text-white">รายการชำระเงิน</h1>
          <p className="soft-copy mt-2 max-w-2xl">
            เลือกวิธีชำระเงินและส่งหลักฐาน Admin จะตรวจสอบและยืนยันให้ภายใน 24 ชั่วโมง
          </p>
        </div>

        {loading && (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="glass-panel rounded-[28px] p-6 space-y-4">
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        )}

        {error && <div className="glass-panel rounded-[24px] p-5 text-sm text-rose-200">{error}</div>}

        {!loading && !error && orders.length === 0 && awaitingOrders.length === 0 && (
          <EmptyState title="ไม่มีรายการรอชำระเงิน" description="เมื่อคุณชนะการประมูล รายการจะปรากฏที่นี่" />
        )}

        {!loading && (awaitingOrders.length > 0 || orders.length > 0) && (
          <div className="mx-auto max-w-2xl space-y-6">
            {awaitingOrders.length > 0 && (
              <div>
                <p className="mb-3 text-sm font-medium text-amber-300/80">รอการตรวจสอบ</p>
                <div className="space-y-3">
                  {awaitingOrders.map((o) => <AwaitingCard key={o.id} order={o} />)}
                </div>
              </div>
            )}
            {orders.length > 0 && (
              <div>
                {awaitingOrders.length > 0 && <p className="mb-3 mt-2 text-sm font-medium text-white/60">รอชำระเงิน</p>}
                <div className="space-y-6">
                  {orders.map((o) => (
                    <OrderCard key={o.id} order={o} paying={paying === o.id} onPay={pay} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-8">
          <Link href="/orders" className="secondary-btn inline-flex px-5 py-2.5 text-sm">← ดูคำสั่งซื้อทั้งหมด</Link>
        </div>
      </section>
    </main>
  );
}
