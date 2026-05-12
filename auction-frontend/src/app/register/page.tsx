'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import Navbar from '@/components/Navbar';
import { useToast } from '@/components/providers/AppProviders';

type Step = 'form' | 'otp';

export default function RegisterPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const setSession = useAuthStore((state) => state.setSession);
  const refreshSession = useAuthStore((state) => state.refreshSession);

  const [step, setStep] = useState<Step>('form');
  const [submitting, setSubmitting] = useState(false);

  // Step 1 fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);

  // Step 2
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [error, setError] = useState('');

  const onRegister = async () => {
    setError('');
    if (password !== confirmPassword) { setError('รหัสผ่านไม่ตรงกัน'); return; }
    if (!agreed) { setError('กรุณายอมรับเงื่อนไขการใช้งานก่อน'); return; }
    try {
      setSubmitting(true);
      const data = await apiPost('/auth/register', { firstName, lastName, phone, email, password });
      setRegisteredEmail(email);
      setDevOtp(data.devOtp || '');
      setStep('otp');
      pushToast({ tone: 'success', title: 'ส่ง OTP แล้ว', description: `ระบบส่ง OTP ไปที่ ${email}` });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'สมัครสมาชิกไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  const onResendOtp = async () => {
    try {
      setSubmitting(true);
      const data = await apiPost('/auth/send-otp', { email: registeredEmail });
      setDevOtp(data.devOtp || '');
      pushToast({ tone: 'info', title: 'ส่ง OTP ใหม่แล้ว', description: 'กรุณาตรวจสอบ OTP ใหม่อีกครั้ง' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ส่ง OTP ไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  const onVerifyOtp = async () => {
    setError('');
    if (otp.length !== 6) { setError('กรุณากรอก OTP 6 หลัก'); return; }
    try {
      setSubmitting(true);
      const data = await apiPost('/auth/verify-otp', { email: registeredEmail, otp });
      setSession(data.user);
      void refreshSession();
      pushToast({ tone: 'success', title: 'ยืนยันสำเร็จ!', description: 'บัญชีของคุณพร้อมใช้งานแล้ว' });
      router.push('/profile');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'OTP ไม่ถูกต้อง');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page-bg min-h-screen">
      <Navbar />
      <section className="section-shell flex min-h-[calc(100vh-64px)] items-center justify-center py-10">
        <div className="w-full max-w-lg">

          {step === 'form' && (
            <div className="glass-panel fade-up rounded-[30px] p-8">
              <p className="text-sm uppercase tracking-[0.18em] text-white/40">สร้างบัญชี</p>
              <h1 className="mt-2 text-3xl font-bold text-white">สมัครสมาชิก</h1>
              <p className="soft-copy mt-2 text-sm">กรอกข้อมูลเพื่อเริ่มประมูลและลงขายสินค้าได้ทันที</p>

              <div className="mt-7 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-sm text-white/65">ชื่อจริง <span className="text-rose-400">*</span></label>
                    <input
                      value={firstName} onChange={(e) => setFirstName(e.target.value)}
                      placeholder="สมชาย" className="field"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm text-white/65">นามสกุล <span className="text-rose-400">*</span></label>
                    <input
                      value={lastName} onChange={(e) => setLastName(e.target.value)}
                      placeholder="ใจดี" className="field"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm text-white/65">เบอร์โทรศัพท์</label>
                  <input
                    type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                    placeholder="08x-xxx-xxxx" className="field"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm text-white/65">อีเมล <span className="text-rose-400">*</span></label>
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@gmail.com" className="field"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm text-white/65">รหัสผ่าน <span className="text-rose-400">*</span></label>
                  <input
                    type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="อย่างน้อย 6 ตัวอักษร" className="field"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm text-white/65">ยืนยันรหัสผ่าน <span className="text-rose-400">*</span></label>
                  <input
                    type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่านอีกครั้ง" className="field"
                  />
                </div>

                <label className="flex cursor-pointer items-start gap-3 pt-1">
                  <input
                    type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded accent-emerald-400"
                  />
                  <span className="text-sm text-white/60">
                    ฉันยอมรับ{' '}
                    <span className="text-white underline underline-offset-4">เงื่อนไขการใช้งาน</span>
                    {' '}และ{' '}
                    <span className="text-white underline underline-offset-4">นโยบายความเป็นส่วนตัว</span>
                  </span>
                </label>
              </div>

              {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}

              <button
                onClick={onRegister}
                disabled={submitting || !firstName || !lastName || !email || !password}
                className="primary-btn mt-6 w-full py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'กำลังสร้างบัญชี...' : 'สมัครสมาชิก'}
              </button>

              <p className="mt-5 text-center text-sm text-white/50">
                มีบัญชีอยู่แล้ว?{' '}
                <Link href="/login" className="text-white underline underline-offset-4">เข้าสู่ระบบ</Link>
              </p>
            </div>
          )}

          {step === 'otp' && (
            <div className="glass-panel fade-up rounded-[30px] p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/15 text-3xl">
                📧
              </div>
              <h2 className="mt-5 text-2xl font-bold text-white">ยืนยันอีเมลของคุณ</h2>
              <p className="soft-copy mt-2 text-sm">
                ระบบส่ง OTP 6 หลักไปที่ <span className="font-medium text-white">{registeredEmail}</span>
              </p>

              {devOtp && (
                <div className="mt-4 rounded-[16px] border border-amber-400/20 bg-amber-400/8 px-4 py-3">
                  <p className="text-xs text-amber-300/70">Dev mode — OTP ของคุณคือ</p>
                  <p className="mt-1 font-mono text-2xl font-bold tracking-[0.3em] text-amber-300">{devOtp}</p>
                </div>
              )}

              <input
                type="text" inputMode="numeric" maxLength={6}
                value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="------"
                className="field mt-6 text-center text-2xl font-mono tracking-[0.4em]"
              />

              {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

              <button
                onClick={onVerifyOtp}
                disabled={submitting || otp.length !== 6}
                className="primary-btn mt-5 w-full py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'กำลังยืนยัน...' : 'ยืนยัน OTP'}
              </button>

              <button
                onClick={onResendOtp}
                disabled={submitting}
                className="mt-3 w-full text-sm text-white/45 hover:text-white/70 disabled:opacity-40"
              >
                ส่ง OTP ใหม่อีกครั้ง
              </button>

              <button
                onClick={() => { setStep('form'); setError(''); setOtp(''); }}
                className="mt-2 w-full text-sm text-white/30 hover:text-white/55"
              >
                ← แก้ไขข้อมูล
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
