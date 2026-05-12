import Image from 'next/image';
import Link from 'next/link';
import { Countdown } from '@/components/ui/Countdown';
import { formatCurrency, translateStatus } from '@/lib/display';

interface Props {
  id: string;
  title: string;
  price: number;
  image: string;
  status: string;
  endAt: string;
  serverNow: string;
  bidCount?: number;
  startPrice?: number;
}

const PLACEHOLDER = 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=640&q=80';

export default function AuctionCard({ id, title, price, image, status, endAt, serverNow, bidCount = 0, startPrice }: Props) {
  const auctionHref = `/auction/${id}`;
  const isLive = status === 'LIVE';
  const isEnded = status === 'ENDED';
  const isScheduled = status === 'SCHEDULED';

  const statusStyle = isLive
    ? 'border-emerald-400/30 bg-emerald-400/14 text-emerald-200'
    : isEnded
      ? 'border-red-400/25 bg-red-400/10 text-red-300'
      : 'border-amber-400/30 bg-amber-400/12 text-amber-200';

  return (
    <article className="glass-panel group flex flex-col overflow-hidden rounded-[24px] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
      {/* Image */}
      <div className="relative overflow-hidden">
        <Image
          src={image || PLACEHOLDER}
          alt={title}
          width={640}
          height={360}
          className="h-52 w-full object-cover transition duration-500 group-hover:scale-105"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/40 to-transparent" />

        {/* Countdown badge (top right) */}
        {!isEnded && (
          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-xs backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            <Countdown endAt={endAt} serverNow={serverNow} compact />
          </div>
        )}

        {/* Bottom overlay: status + title */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <span className={`status-chip ${statusStyle}`}>
            {isLive && (
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            )}
            {translateStatus(status)}
          </span>
          <h4 className="mt-2 line-clamp-2 text-base font-semibold leading-snug text-white">
            {title}
          </h4>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">
              {isEnded ? 'ราคาสุดท้าย' : 'ราคาปัจจุบัน'}
            </p>
            <p className="mt-0.5 text-2xl font-bold text-white">{formatCurrency(price)}</p>
            {startPrice !== undefined && startPrice < price && (
              <p className="text-[11px] text-white/35">เริ่มต้น {formatCurrency(startPrice)}</p>
            )}
          </div>
          {bidCount > 0 && (
            <div className="text-right">
              <p className="text-xl font-bold text-white">{bidCount}</p>
              <p className="text-[11px] text-white/40">ข้อเสนอ</p>
            </div>
          )}
          {bidCount === 0 && !isEnded && (
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-center">
              <p className="text-[11px] text-white/40">ยังไม่มี</p>
              <p className="text-[11px] text-white/40">ข้อเสนอ</p>
            </div>
          )}
        </div>

        <Link
          href={auctionHref}
          className={`primary-btn mt-4 block w-full py-2.5 text-center text-sm font-semibold ${
            isEnded ? 'opacity-70' : ''
          }`}
        >
          {isLive ? 'เข้าร่วมประมูล' : isEnded ? 'ดูผลการประมูล' : 'ดูรายละเอียด'}
        </Link>
      </div>
    </article>
  );
}
