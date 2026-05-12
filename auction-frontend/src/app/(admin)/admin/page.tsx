import Navbar from '@/components/Navbar';
import AdminClient from '@/components/pages/AdminClient';
import { apiGet } from '@/lib/api';
import { AdminOverview, Profile } from '@/lib/types';
import { redirect } from 'next/navigation';

export default async function AdminPage() {
  let shouldRedirectToLogin = false;
  try {
    const profile = (await apiGet('/users/me')) as Profile;
    if (profile.role !== 'ADMIN') {
      redirect('/');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('กรุณาเข้าสู่ระบบ') || message.includes('401')) {
      shouldRedirectToLogin = true;
    }
  }

  if (shouldRedirectToLogin) {
    redirect('/login?next=/admin');
  }

  let initialOverview: AdminOverview | null = null;
  try {
    initialOverview = await apiGet('/admin/overview');
  } catch {
    initialOverview = null;
  }

  return (
    <main className="min-h-screen page-bg">
      <Navbar />
      <AdminClient initialOverview={initialOverview} />
    </main>
  );
}
