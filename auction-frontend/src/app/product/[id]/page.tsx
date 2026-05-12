import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency, formatDateTime, translateStatus } from '@/lib/display';
import { Auction } from '@/lib/types';

export default async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!id) {
    notFound();
  }

  let auction: Auction;

  try {
    auction = await apiGet(`/auctions/${id}`);
  } catch {
    notFound();
  }

  if (!auction.product) {
    notFound();
  }

  return (
    <main className="flex min-h-screen flex-col page-bg">
      <Navbar />
      <section className="section-shell py-10 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="glass-panel overflow-hidden rounded-[30px]">
            <Image
              src={auction.product.images?.[0]}
              alt={auction.product.title}
              width={900}
              height={600}
              className="h-[360px] w-full object-cover"
              unoptimized
            />
          </div>

          <div className="glass-panel rounded-[30px] p-7">
            <span className="status-chip border-amber-300/24 bg-amber-300/10 text-amber-100">
              สถานะ {translateStatus(auction.status)}
            </span>
            <h1 className="mt-5 text-4xl font-semibold text-white">{auction.product.title}</h1>
            <p className="soft-copy mt-4 text-base">{auction.product.description}</p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[22px] border border-white/10 bg-white/6 p-4">
                <p className="text-sm text-white/55">ราคาประมูลล่าสุด</p>
                <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(auction.currentBid)}</p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/6 p-4">
                <p className="text-sm text-white/55">เวลาปิดประมูล</p>
                <p className="mt-2 text-base font-medium text-white">{formatDateTime(auction.endAt)}</p>
              </div>
            </div>

            <Link href={`/auction/${auction.id}`} className="primary-btn mt-8 inline-block px-6 py-3">
              ไปหน้าวางราคา
            </Link>
          </div>
        </div>

        <div className="glass-panel mt-8 rounded-[30px] p-7">
          <h3 className="text-2xl font-semibold text-white">ประวัติการประมูล</h3>
          {auction.bids.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                title="ยังไม่มีประวัติการประมูล"
                description="รายการนี้ยังไม่มีผู้เสนอราคา ลองเป็นคนแรกที่เริ่มต้นการประมูล"
              />
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {auction.bids.map((bid) => (
                <div key={bid.id} className="rounded-[22px] border border-white/10 bg-white/6 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">ผู้ใช้ {bid.userId}</p>
                      <p className="soft-copy mt-1 text-xs">{formatDateTime(bid.createdAt)}</p>
                    </div>
                    <p className="text-lg font-semibold text-white">{formatCurrency(bid.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </main>
  );
}
