'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import Navbar from '@/components/Navbar';
import { useToast } from '@/components/providers/AppProviders';

type View = 'login' | 'forgot' | 'reset';

export default function LoginPage() {
  const router = useRouter();
  const { pushToast } = useToast();
  const setSession = useAuthStore((state) => state.setSession);
  const refreshSession = useAuthStore((state) => state.refreshSession);

  const [view, setView] = useState<View>('login');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Forgot password fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [devOtp, setDevOtp] = useState('');

  const onLogin = async () => {
    setError('');
    try {
      setSubmitting(true);
      const data = await apiPost('/auth/login', { email, password });
      setSession(data.user);
      void refreshSession();
      pushToast({ tone: 'success', title: 'เข้าสู่ระบบสำเร็จ', description: 'ยินดีต้อนรับกลับมา!' });
      router.push('/profile');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    } finally {
      setSubmitting(false);
    }
  };

  const onForgotPassword = async () => {
    setError('');
    if (!forgotEmail) { setError('กรุณากรอกอีเมล'); return; }
    try {
      setSubmitting(true);
      const data = await apiPost('/auth/forgot-password', { email: forgotEmail });
      setDevOtp(data.devOtp || '');
      setView('reset');
      pushToast({ tone: 'info', title: 'ส่ง OTP แล้ว', description: `ตรวจสอบ OTP ที่ ${forgotEmail}` });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ไม่สามารถส่ง OTP ได้');
    } finally {
      setSubmitting(false);
    }
  };

  const onResetPassword = async () => {
    setError('');
    if (newPassword !== confirmNewPassword) { setError('รหัสผ่านใหม่ไม่ตรงกัน'); return; }
    if (newPassword.length < 6) { setError('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return; }
    try {
      setSubmitting(true);
      await apiPost('/auth/reset-password', { email: forgotEmail, otp: resetOtp, newPassword });
      pushToast({ tone: 'success', title: 'รีเซ็ตสำเร็จ', description: 'กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่' });
      setView('login');
      setEmail(forgotEmail);
      setPassword('');
      setResetOtp('');
      setNewPassword('');
      setConfirmNewPassword('');
      setDevOtp('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'รีเซ็ตรหัสผ่านไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="page-bg min-h-screen">
      <Navbar />
      <section className="section-shell flex min-h-[calc(100vh-64px)] items-center justify-center py-10">
        <div className="w-full max-w-md">

          {/* Login form */}
          {view === 'login' && (
            <div className="glass-panel fade-up rounded-[30px] p-8">
              <p className="text-sm uppercase tracking-[0.18em] text-white/40">เข้าสู่ระบบ</p>
              <h1 className="mt-2 text-3xl font-bold text-white">ยินดีต้อนรับกลับ</h1>
              <p className="soft-copy mt-2 text-sm">กรอกอีเมลและรหัสผ่านเพื่อเข้าสู่บัญชีของคุณ</p>

              <div className="mt-7 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm text-white/65">อีเมล</label>
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void onLogin()}
                    placeholder="example@gmail.com" className="field"
                    autoComplete="email"
                  />
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-sm text-white/65">รหัสผ่าน</label>
                    <button
                      type="button" onClick={() => { setView('forgot'); setForgotEmail(email); setError(''); }}
                      className="text-xs text-white/45 underline underline-offset-4 hover:text-white/70"
                    >
                      ลืมรหัสผ่าน?
                    </button>
                  </div>
                  <input
                    type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void onLogin()}
                    placeholder="รหัสผ่านของคุณ" className="field"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}

              <button
                onClick={onLogin}
                disabled={submitting || !email || !password}
                className="primary-btn mt-6 w-full py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              </button>

              <div className="relative mt-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[rgba(7,17,21,0.9)] px-3 text-xs text-white/35">หรือ</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button className="secondary-btn py-2.5 text-sm" disabled>
                  🔵 Google
                </button>
                <button className="secondary-btn py-2.5 text-sm" disabled>
                  🔷 Facebook
                </button>
              </div>

              <p className="mt-6 text-center text-sm text-white/50">
                ยังไม่มีบัญชี?{' '}
                <Link href="/register" className="text-white underline underline-offset-4">สมัครสมาชิก</Link>
              </p>
            </div>
          )}

          {/* Forgot password — enter email */}
          {view === 'forgot' && (
            <div className="glass-panel fade-up rounded-[30px] p-8">
              <button
                onClick={() => { setView('login'); setError(''); }}
                className="mb-5 flex items-center gap-1.5 text-sm text-white/45 hover:text-white/70"
              >
                ← กลับ
              </button>
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-400/12 text-2xl">
                🔑
              </div>
              <h2 className="text-2xl font-bold text-white">ลืมรหัสผ่าน</h2>
              <p className="soft-copy mt-2 text-sm">กรอกอีเมลที่ใช้สมัครสมาชิก ระบบจะส่ง OTP ให้</p>

              <div className="mt-6">
                <label className="mb-1.5 block text-sm text-white/65">อีเมล</label>
                <input
                  type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="example@gmail.com" className="field"
                />
              </div>

              {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}

              <button
                onClick={onForgotPassword}
                disabled={submitting || !forgotEmail}
                className="primary-btn mt-5 w-full py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'กำลังส่ง...' : 'ส่ง OTP'}
              </button>
            </div>
          )}

          {/* Reset password — enter OTP + new password */}
          {view === 'reset' && (
            <div className="glass-panel fade-up rounded-[30px] p-8">
              <button
                onClick={() => { setView('forgot'); setError(''); setResetOtp(''); }}
                className="mb-5 flex items-center gap-1.5 text-sm text-white/45 hover:text-white/70"
              >
                ← กลับ
              </button>
              <h2 className="text-2xl font-bold text-white">ตั้งรหัสผ่านใหม่</h2>
              <p className="soft-copy mt-2 text-sm">
                ส่ง OTP ไปที่ <span className="text-white">{forgotEmail}</span> แล้ว
              </p>

              {devOtp && (
                <div className="mt-4 rounded-[14px] border border-amber-400/20 bg-amber-400/8 px-4 py-3">
                  <p className="text-xs text-amber-300/70">Dev mode — OTP</p>
                  <p className="font-mono text-xl font-bold tracking-[0.3em] text-amber-300">{devOtp}</p>
                </div>
              )}

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm text-white/65">รหัส OTP 6 หลัก</label>
                  <input
                    type="text" inputMode="numeric" maxLength={6}
                    value={resetOtp} onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="------" className="field text-center font-mono tracking-[0.3em]"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-white/65">รหัสผ่านใหม่</label>
                  <input
                    type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="อย่างน้อย 6 ตัวอักษร" className="field"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-white/65">ยืนยันรหัสผ่านใหม่</label>
                  <input
                    type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="กรอกอีกครั้ง" className="field"
                  />
                </div>
              </div>

              {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}

              <button
                onClick={onResetPassword}
                disabled={submitting || resetOtp.length !== 6 || !newPassword}
                className="primary-btn mt-5 w-full py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? 'กำลังบันทึก...' : 'ตั้งรหัสผ่านใหม่'}
              </button>
            </div>
          )}

        </div>
      </section>
    </main>
  );
}
