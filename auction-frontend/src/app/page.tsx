import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AuctionCard from '@/components/AuctionCard';
import { DebouncedSearchForm } from '@/components/ui/DebouncedSearchForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { apiGet } from '@/lib/api';
import { formatCurrency } from '@/lib/display';
import { PaginatedAuctions } from '@/lib/types';

type HomeSearchParams = {
  q?: string;
  status?: 'ALL' | 'LIVE' | 'SCHEDULED' | 'ENDED';
  sort?: 'latest' | 'ending' | 'price_desc' | 'price_asc';
  page?: string;
  minPrice?: string;
  maxPrice?: string;
};

export default async function HomePage({ searchParams }: { searchParams: Promise<HomeSearchParams> }) {
  const { q, status = 'ALL', sort = 'latest', page = '1', minPrice, maxPrice } = await searchParams;

  const query = new URLSearchParams();
  if (q) query.set('q', q);
  if (status) query.set('status', status);
  if (sort) query.set('sort', sort);
  if (minPrice) query.set('minPrice', minPrice);
  if (maxPrice) query.set('maxPrice', maxPrice);
  query.set('page', page);
  query.set('limit', '9');

  let data: PaginatedAuctions = {
    items: [],
    pagination: { page: 1, limit: 9, total: 0, totalPages: 1, hasPrev: false, hasNext: false },
  };
  let apiError = '';
  try {
    data = (await apiGet(`/auctions?${query.toString()}`, { next: { revalidate: 15 } })) as PaginatedAuctions;
  } catch (error) {
    apiError = error instanceof Error ? error.message : 'ไม่สามารถโหลดรายการประมูลได้';
  }

  const auctions = data.items;
  const { pagination } = data;
  const pages = Array.from({ length: pagination.totalPages }, (_, i) => i + 1);

  const liveCount = auctions.filter((a) => a.status === 'LIVE').length;
  const totalBids = auctions.reduce((sum, a) => sum + (a.bidCount ?? 0), 0);
  const topBid = auctions.reduce((max, a) => Math.max(max, a.currentBid), 0);

  const buildUrl = (overrides: Record<string, string>) => {
    const p = new URLSearchParams({
      ...(q ? { q } : {}),
      status,
      sort,
      ...(minPrice ? { minPrice } : {}),
      ...(maxPrice ? { maxPrice } : {}),
      page,
      ...overrides,
    });
    return `/?${p.toString()}`;
  };

  return (
    <main className="flex min-h-screen flex-col">
      <Navbar />

      {/* Hero */}
      <section className="section-shell py-10 lg:py-14">
        <div className="fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/8 px-3.5 py-1.5 text-xs text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            เปิดให้ประมูลแบบเรียลไทม์
          </div>

          <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
            ประมูลสินค้า{' '}
            <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
              ที่ใช่
            </span>{' '}
            ด้วยราคาที่ดีที่สุด
          </h1>
          <p className="soft-copy mt-4 max-w-2xl text-lg">
            ค้นหา เสนอราคา และชนะการประมูลสินค้าที่คุณต้องการ — ทั้งหมดในที่เดียว ปลอดภัย โปร่งใส เรียลไทม์
          </p>
        </div>

        {/* Stats cards */}
        <div className="fade-up mt-8 grid grid-cols-3 gap-3 sm:gap-4">
          <div className="glass-panel rounded-[20px] p-4 sm:p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">กำลังประมูล</p>
            <p className="mt-2 text-3xl font-bold text-emerald-300">{liveCount}</p>
            <p className="mt-0.5 text-xs text-white/35">รายการสด</p>
          </div>
          <div className="glass-panel rounded-[20px] p-4 sm:p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">ข้อเสนอทั้งหมด</p>
            <p className="mt-2 text-3xl font-bold text-amber-300">{totalBids}</p>
            <p className="mt-0.5 text-xs text-white/35">รายการนี้</p>
          </div>
          <div className="glass-panel rounded-[20px] p-4 sm:p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">ราคาสูงสุด</p>
            <p className="mt-2 text-2xl font-bold text-white sm:text-3xl">{formatCurrency(topBid)}</p>
            <p className="mt-0.5 text-xs text-white/35">ในหน้านี้</p>
          </div>
        </div>

        {/* Search & Filter */}
        <DebouncedSearchForm className="fade-up mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
          <div className="relative sm:col-span-2">
            <svg
              className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35"
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              name="q"
              placeholder="ค้นหาจากชื่อสินค้า..."
              defaultValue={q}
              className="field pl-10"
            />
          </div>
          <select name="status" defaultValue={status} className="field">
            <option value="ALL">ทุกสถานะ</option>
            <option value="LIVE">กำลังประมูล</option>
            <option value="SCHEDULED">รอเปิด</option>
            <option value="ENDED">ปิดแล้ว</option>
          </select>
          <select name="sort" defaultValue={sort} className="field">
            <option value="latest">ล่าสุด</option>
            <option value="ending">ใกล้ปิดก่อน</option>
            <option value="price_desc">ราคาสูงสุด</option>
            <option value="price_asc">ราคาต่ำสุด</option>
          </select>
          <input
            type="number"
            min="0"
            name="minPrice"
            placeholder="ราคาต่ำสุด"
            defaultValue={minPrice}
            className="field"
          />
          <input
            type="number"
            min="0"
            name="maxPrice"
            placeholder="ราคาสูงสุด"
            defaultValue={maxPrice}
            className="field"
          />
          <button className="primary-btn px-5 py-3 text-sm font-semibold" type="submit">
            ค้นหา
          </button>
        </DebouncedSearchForm>

        {/* Filter quick pills */}
        <div className="mt-4 flex flex-wrap gap-2">
          {['ALL', 'LIVE', 'SCHEDULED', 'ENDED'].map((s) => (
            <a
              key={s}
              href={buildUrl({ status: s, page: '1' })}
              className={`rounded-full border px-3.5 py-1.5 text-xs transition ${
                status === s
                  ? 'border-white/30 bg-white/12 text-white font-semibold'
                  : 'border-white/10 text-white/50 hover:border-white/20 hover:text-white/80'
              }`}
            >
              {s === 'ALL' ? 'ทั้งหมด' : s === 'LIVE' ? 'กำลังประมูล' : s === 'SCHEDULED' ? 'รอเปิด' : 'ปิดแล้ว'}
            </a>
          ))}
        </div>
      </section>

      {/* Auction grid */}
      <section className="section-shell pb-14">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">Marketplace</p>
            <h2 className="mt-1.5 text-2xl font-bold text-white">รายการประมูล</h2>
          </div>
          <p className="soft-copy text-sm">
            {pagination.total > 0 ? `${pagination.total} รายการ` : 'ไม่พบรายการ'}
          </p>
        </div>

        {auctions.length === 0 ? (
          <EmptyState
            title={apiError ? 'เชื่อมต่อบริการประมูลไม่สำเร็จ' : 'ไม่พบรายการที่ตรงกับการค้นหา'}
            description={apiError || 'ลองเปลี่ยนคำค้นหา หรือปรับตัวกรองแล้วลองใหม่อีกครั้ง'}
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {auctions.map((item) => (
              <AuctionCard
                key={item.id}
                id={item.id}
                title={item.product?.title || 'ไม่ทราบชื่อสินค้า'}
                price={item.currentBid}
                image={item.product?.images?.[0] || ''}
                status={item.status}
                endAt={item.endAt}
                serverNow={item.serverNow}
                bidCount={item.bidCount}
                startPrice={item.product?.startPrice}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="flex items-center gap-2">
              <a
                href={buildUrl({ page: String(Math.max(1, pagination.page - 1)) })}
                className={`secondary-btn px-4 py-2 text-sm ${!pagination.hasPrev ? 'pointer-events-none opacity-40' : ''}`}
              >
                ← ก่อนหน้า
              </a>

              <div className="flex items-center gap-1">
                {pages.map((p) => (
                  <a
                    key={p}
                    href={buildUrl({ page: String(p) })}
                    className={`h-9 w-9 rounded-xl text-center text-sm leading-9 transition ${
                      p === pagination.page
                        ? 'bg-white font-semibold text-slate-950'
                        : 'text-white/55 hover:bg-white/8 hover:text-white'
                    }`}
                  >
                    {p}
                  </a>
                ))}
              </div>

              <a
                href={buildUrl({ page: String(Math.min(pagination.totalPages, pagination.page + 1)) })}
                className={`secondary-btn px-4 py-2 text-sm ${!pagination.hasNext ? 'pointer-events-none opacity-40' : ''}`}
              >
                ถัดไป →
              </a>
            </div>
            <p className="soft-copy text-xs">
              หน้า {pagination.page} จาก {pagination.totalPages} ({pagination.total} รายการ)
            </p>
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="section-shell pb-14">
        <div className="glass-panel rounded-[28px] p-8">
          <p className="text-center text-xs uppercase tracking-[0.2em] text-white/40">วิธีใช้งาน</p>
          <h2 className="mt-2 text-center text-2xl font-bold text-white">ประมูลได้ใน 3 ขั้นตอน</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              {
                step: '01',
                title: 'สมัครสมาชิก',
                desc: 'สร้างบัญชีฟรีในไม่กี่วินาที ยืนยันอีเมลและพร้อมใช้งานทันที',
                color: 'text-amber-300',
              },
              {
                step: '02',
                title: 'เลือกรายการ',
                desc: 'ค้นหาสินค้าที่สนใจ ดูรายละเอียดและประวัติการประมูล',
                color: 'text-emerald-300',
              },
              {
                step: '03',
                title: 'เสนอราคา',
                desc: 'เสนอราคาและติดตามผลแบบเรียลไทม์ ชนะ → ชำระเงิน → รับสินค้า',
                color: 'text-sky-300',
              },
            ].map(({ step, title, desc, color }) => (
              <div key={step} className="text-center">
                <div className={`text-4xl font-black ${color} opacity-60`}>{step}</div>
                <h3 className="mt-2 text-base font-semibold text-white">{title}</h3>
                <p className="soft-copy mt-2 text-sm">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <a href="/register" className="primary-btn inline-block px-8 py-3 text-sm font-semibold">
              สมัครสมาชิกฟรี
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
