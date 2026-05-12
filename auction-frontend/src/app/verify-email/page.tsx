'use client';

import { useState } from 'react';
import { apiPost } from '@/lib/api';
import Navbar from '@/components/Navbar';
import { useToast } from '@/components/providers/AppProviders';

export default function VerifyPage() {
  const { pushToast } = useToast();
  const [email, setEmail] = useState('new@auction.dev');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onVerify = async () => {
    try {
      setSubmitting(true);
      const data = await apiPost('/auth/verify-email', { email });
      const nextMessage = `ยืนยันอีเมล ${data.user.email} เรียบร้อยแล้ว`;
      setMessage(nextMessage);
      pushToast({
        tone: 'success',
        title: 'ยืนยันอีเมลสำเร็จ',
        description: nextMessage,
      });
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : 'ยืนยันอีเมลไม่สำเร็จ';
      setMessage(nextMessage);
      pushToast({
        tone: 'error',
        title: 'ยืนยันอีเมลไม่สำเร็จ',
        description: nextMessage,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen page-bg">
      <Navbar />
      <section className="section-shell grid gap-8 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:py-14">
        <aside className="glass-panel rounded-[30px] p-7">
          <span className="status-chip border-emerald-300/24 bg-emerald-300/10 text-emerald-100">
            ยืนยันตัวตน
          </span>
          <h1 className="mt-5 text-4xl font-semibold text-white">
            ทำให้อีเมลของผู้ใช้พร้อมใช้งานในระบบด้วยขั้นตอนที่สั้นและชัด
          </h1>
          <p className="soft-copy mt-4 text-base">
            ใช้หน้านี้เพื่อทดสอบ flow การยืนยันอีเมลก่อนอนุญาตให้บัญชีใช้งานบางส่วนของระบบ
          </p>
        </aside>

        <div className="glass-panel rounded-[30px] p-7">
          <p className="text-sm uppercase tracking-[0.18em] text-white/45">Verify email</p>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field mt-6"
            placeholder="อีเมลที่ต้องการยืนยัน"
          />
          <button
            onClick={onVerify}
            disabled={submitting || !email}
            className="primary-btn mt-4 w-full px-4 py-3 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'กำลังยืนยัน...' : 'ยืนยันอีเมล'}
          </button>
          <p className="mt-4 min-h-6 text-sm text-emerald-100/90">{message}</p>
        </div>
      </section>
    </main>
  );
}
