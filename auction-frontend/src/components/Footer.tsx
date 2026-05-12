import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-white/8 bg-[rgba(7,15,19,0.7)] backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,#8dd3c7,#52b788)] text-xs font-bold text-slate-950">
                AH
              </span>
              <span className="text-sm font-bold text-white">AuctionHub</span>
            </div>
            <p className="soft-copy mt-3 text-sm leading-relaxed">
              ตลาดประมูลออนไลน์แบบเรียลไทม์ เชื่อถือได้ โปร่งใส ใช้งานง่าย
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">นำทาง</p>
            <ul className="mt-3 space-y-2">
              {[
                { href: '/', label: 'หน้าหลัก' },
                { href: '/tracking', label: 'ติดตามสินค้า' },
                { href: '/login', label: 'เข้าสู่ระบบ' },
                { href: '/register', label: 'สมัครสมาชิก' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="soft-copy text-sm transition hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* For sellers */}
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">สำหรับผู้ขาย</p>
            <ul className="mt-3 space-y-2">
              {[
                { href: '/sell', label: 'ลงขายสินค้า' },
                { href: '/dashboard', label: 'แดชบอร์ดผู้ขาย' },
                { href: '/orders', label: 'ติดตามคำสั่งซื้อ' },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="soft-copy text-sm transition hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-white/40">ช่วยเหลือ</p>
            <ul className="mt-3 space-y-2">
              {[
                { label: 'วิธีการประมูล' },
                { label: 'นโยบายการคืนสินค้า' },
                { label: 'ติดต่อเรา' },
              ].map((item) => (
                <li key={item.label}>
                  <span className="soft-copy cursor-default text-sm">{item.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/8 pt-6 sm:flex-row">
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} AuctionHub. สงวนลิขสิทธิ์ทุกประการ
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-white/30">ระบบประมูลออนไลน์</span>
            <span className="h-1 w-1 rounded-full bg-white/20" />
            <span className="text-xs text-white/30">MongoDB · Express · Next.js</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
