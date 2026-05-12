'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { apiGet, apiPost } from '@/lib/api';
import { joinAuction, leaveAuction, getSocket } from '@/lib/socket';
import { Auction, Bid } from '@/lib/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { Countdown } from '@/components/ui/Countdown';
import { formatCurrency, formatDateTime, translateStatus } from '@/lib/display';
import { useToast } from '@/components/providers/AppProviders';

const PLACEHOLDER = 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80';

interface BidEvent {
  auctionId: string;
  currentBid: number;
  minNextBid: number;
  bid: Bid;
}

export default function AuctionClient({ initialAuction }: { initialAuction: Auction }) {
  const { pushToast } = useToast();
  const [auction, setAuction] = useState<Auction>(initialAuction);
  const [bid, setBid] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isLive = auction.status === 'LIVE';
  const isEnded = auction.status === 'ENDED';
  const images = auction.product?.images?.filter(Boolean) || [];
  const displayImages = images.length > 0 ? images : [PLACEHOLDER];
  const minNextBid = auction.minNextBid ?? (auction.currentBid + Math.max(100, Math.floor(auction.currentBid * 0.02)));

  const load = async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    try {
      const data: Auction = await apiGet(`/auctions/${auction.id}`);
      setAuction(data);
    } catch {
      // silent fail
    } finally {
      setRefreshing(false);
    }
  };

  // Socket.io real-time updates
  useEffect(() => {
    const socket = getSocket();
    joinAuction(auction.id);

    const handleBid = (event: BidEvent) => {
      if (event.auctionId !== auction.id) return;
      setAuction((prev) => ({
        ...prev,
        currentBid: event.currentBid,
        minNextBid: event.minNextBid,
        bids: [event.bid, ...prev.bids],
        bidCount: (prev.bidCount || 0) + 1,
      }));
      pushToast({
        tone: 'info',
        title: 'มีการเสนอราคาใหม่',
        description: `ราคาปัจจุบัน ${formatCurrency(event.currentBid)}`,
      });
    };

    socket.on('bid_placed', handleBid);
    return () => {
      socket.off('bid_placed', handleBid);
      leaveAuction(auction.id);
    };
  }, [auction.id]);

  // Polling fallback every 30s for non-live auctions
  useEffect(() => {
    if (isEnded) return;
    pollRef.current = setInterval(() => load(true), 30_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isEnded, auction.id]);

  const placeBid = async () => {
    const amount = Number(bid);
    if (!amount || amount <= auction.currentBid) {
      pushToast({
        tone: 'error',
        title: 'ราคาไม่ถูกต้อง',
        description: `ต้องเสนอมากกว่า ${formatCurrency(auction.currentBid)}`,
      });
      return;
    }

    try {
      setSubmitting(true);
      const result = await apiPost(`/auctions/${auction.id}/bid`, { amount });
      setBid('');
      pushToast({
        tone: 'success',
        title: 'วางราคาสำเร็จ',
        description: `ราคาของคุณ ${formatCurrency(amount)} ถูกบันทึกแล้ว`,
      });
      await load(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'วางราคาไม่สำเร็จ';
      pushToast({ tone: 'error', title: 'วางราคาไม่สำเร็จ', description: message });
    } finally {
      setSubmitting(false);
    }
  };

  const setQuickBid = (amount: number) => setBid(String(amount));

  const quickAmounts = [
    minNextBid,
    minNextBid + Math.floor(minNextBid * 0.05),
    minNextBid + Math.floor(minNextBid * 0.1),
  ];

  return (
    <section className="section-shell py-8 lg:py-12">
      {/* Back */}
      <a href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-white/50 transition hover:text-white">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M5 12l7 7M5 12l7-7" />
        </svg>
        กลับหน้าหลัก
      </a>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        {/* Left: product info */}
        <div className="space-y-4">
          {/* Image gallery */}
          <div className="glass-panel overflow-hidden rounded-[28px]">
            <div className="relative overflow-hidden">
              <Image
                src={displayImages[activeImage]}
                alt={auction.product.title}
                width={900}
                height={540}
                className="h-[340px] w-full object-cover transition duration-500 sm:h-[400px]"
                unoptimized
              />
              {/* Status overlay */}
              <div className="absolute left-4 top-4">
                <span
                  className={`status-chip ${
                    isLive
                      ? 'border-emerald-400/30 bg-emerald-400/20 text-emerald-200'
                      : isEnded
                        ? 'border-red-400/25 bg-red-400/14 text-red-300'
                        : 'border-amber-400/30 bg-amber-400/14 text-amber-200'
                  }`}
                >
                  {isLive && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />}
                  {translateStatus(auction.status)}
                </span>
              </div>
              {/* Refresh indicator */}
              {refreshing && (
                <div className="absolute right-4 top-4 rounded-full border border-white/15 bg-black/50 px-2.5 py-1 text-xs text-white/60 backdrop-blur-md">
                  กำลังอัปเดต...
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {displayImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto p-3">
                {displayImages.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`h-16 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 transition ${
                      i === activeImage ? 'border-white/70' : 'border-white/10 opacity-50 hover:opacity-80'
                    }`}
                  >
                    <Image src={src} alt="" width={80} height={64} className="h-full w-full object-cover" unoptimized />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product details */}
          <div className="glass-panel rounded-[28px] p-6">
            <h1 className="text-3xl font-bold text-white">{auction.product.title}</h1>
            {auction.product.description && (
              <p className="soft-copy mt-3 leading-relaxed">{auction.product.description}</p>
            )}

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-widest text-white/40">ราคาปัจจุบัน</p>
                <p className="mt-1.5 text-xl font-bold text-white">{formatCurrency(auction.currentBid)}</p>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-widest text-white/40">
                  {isEnded ? 'เวลาปิด' : 'เวลาคงเหลือ'}
                </p>
                {isEnded ? (
                  <p className="mt-1.5 text-base font-medium text-red-300">{formatDateTime(auction.endAt)}</p>
                ) : (
                  <div className="mt-1.5">
                    <Countdown endAt={auction.endAt} serverNow={auction.serverNow} className="text-xl font-bold" />
                  </div>
                )}
              </div>
              <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-widest text-white/40">จำนวนข้อเสนอ</p>
                <p className="mt-1.5 text-xl font-bold text-white">{auction.bidCount ?? auction.bids.length}</p>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-white/5 p-4">
                <p className="text-[11px] uppercase tracking-widest text-white/40">ราคาเริ่มต้น</p>
                <p className="mt-1.5 text-xl font-bold text-white">
                  {formatCurrency(auction.product.startPrice ?? 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right: bidding panel */}
        <div className="space-y-4">
          {/* Bid form */}
          <div className="glass-panel rounded-[28px] p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">วางราคาประมูล</p>
            <h2 className="mt-2 text-2xl font-bold text-white">เข้าร่วมการประมูล</h2>

            {isEnded ? (
              <div className="mt-5 rounded-[18px] border border-red-400/20 bg-red-400/10 p-5 text-center">
                <p className="text-lg font-semibold text-red-300">การประมูลสิ้นสุดแล้ว</p>
                <p className="soft-copy mt-1 text-sm">ปิดรับการเสนอราคาเมื่อ {formatDateTime(auction.endAt)}</p>
                {auction.winnerId && (
                  <p className="mt-2 text-sm text-emerald-300">ราคาสุดท้าย: {formatCurrency(auction.currentBid)}</p>
                )}
              </div>
            ) : (
              <>
                {/* Current bid highlight */}
                <div className="mt-5 rounded-[18px] border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-white/45">ราคาปัจจุบัน</p>
                      <p className="mt-1 text-3xl font-bold text-white">{formatCurrency(auction.currentBid)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-white/45">เสนอขั้นต่ำ</p>
                      <p className="mt-1 text-xl font-semibold text-amber-300">{formatCurrency(minNextBid)}</p>
                    </div>
                  </div>
                </div>

                {/* Quick bid buttons */}
                <div className="mt-4">
                  <p className="mb-2 text-xs text-white/40">เสนอราคาด่วน</p>
                  <div className="grid grid-cols-3 gap-2">
                    {quickAmounts.map((amount, i) => (
                      <button
                        key={i}
                        onClick={() => setQuickBid(amount)}
                        className="secondary-btn py-2 text-sm"
                      >
                        {formatCurrency(amount)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom amount input */}
                <div className="mt-4">
                  <p className="mb-2 text-xs text-white/40">หรือกรอกราคาเอง</p>
                  <input
                    type="number"
                    value={bid}
                    onChange={(e) => setBid(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !submitting && bid && placeBid()}
                    placeholder={`ขั้นต่ำ ${minNextBid.toLocaleString('th-TH')} บาท`}
                    min={minNextBid}
                    className="field"
                  />
                </div>

                <button
                  onClick={placeBid}
                  disabled={submitting || !bid || Number(bid) <= auction.currentBid}
                  className="primary-btn mt-4 w-full px-4 py-3 text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      กำลังยืนยัน...
                    </span>
                  ) : (
                    'ยืนยันการเสนอราคา'
                  )}
                </button>

                <p className="mt-3 text-center text-xs text-white/35">
                  การเสนอราคาไม่สามารถยกเลิกได้ กรุณาตรวจสอบก่อนยืนยัน
                </p>
              </>
            )}
          </div>

          {/* Info panel */}
          <div className="glass-panel rounded-[28px] p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">ข้อมูลการประมูล</p>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/55">เปิดประมูล</span>
                <span className="text-white">{formatDateTime(auction.startAt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/55">ปิดประมูล</span>
                <span className="text-white">{formatDateTime(auction.endAt)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/55">จำนวนผู้เสนอ</span>
                <span className="text-white">{auction.bidCount ?? auction.bids.length} ครั้ง</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/55">ราคาเริ่มต้น</span>
                <span className="text-white">{formatCurrency(auction.product.startPrice ?? 0)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bid history */}
      <div className="glass-panel mt-6 rounded-[28px] p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">
            ประวัติการเสนอราคา
            {auction.bids.length > 0 && (
              <span className="ml-2 text-base font-normal text-white/45">({auction.bids.length} รายการ)</span>
            )}
          </h3>
          {!isEnded && (
            <button
              onClick={() => load()}
              disabled={refreshing}
              className="secondary-btn px-3 py-1.5 text-xs disabled:opacity-50"
            >
              {refreshing ? 'กำลังโหลด...' : 'รีเฟรช'}
            </button>
          )}
        </div>

        {auction.bids.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              title="ยังไม่มีการเสนอราคา"
              description="เป็นคนแรกที่เสนอราคาในรายการนี้!"
            />
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {auction.bids.map((item, idx) => {
              const isHighest = idx === 0;
              return (
                <div
                  key={item.id}
                  className={`flex items-center justify-between rounded-[18px] border p-4 transition ${
                    isHighest
                      ? 'border-emerald-400/20 bg-emerald-400/8'
                      : 'border-white/8 bg-white/4'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                        isHighest ? 'bg-emerald-400/20 text-emerald-300' : 'bg-white/8 text-white/50'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {isHighest ? 'ผู้นำประมูล' : `ผู้เสนอ #${idx + 1}`}
                        {isHighest && (
                          <span className="ml-2 rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] text-emerald-300">
                            สูงสุด
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-white/40">{formatDateTime(item.createdAt)}</p>
                    </div>
                  </div>
                  <p className={`text-lg font-bold ${isHighest ? 'text-emerald-300' : 'text-white'}`}>
                    {formatCurrency(item.amount)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
