import Navbar from '@/components/Navbar';
import AdminPaymentsClient from '@/components/pages/AdminPaymentsClient';
import { apiGet } from '@/lib/api';
import { Profile } from '@/lib/types';
import { redirect } from 'next/navigation';

export default async function AdminPaymentsPage() {
  try {
    const profile = (await apiGet('/users/me')) as Profile;
    if (profile.role !== 'ADMIN') redirect('/');
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('กรุณาเข้าสู่ระบบ') || message.includes('401')) {
      redirect('/login?next=/admin/payments');
    }
  }

  return (
    <main className="min-h-screen page-bg">
      <Navbar />
      <AdminPaymentsClient />
    </main>
  );
}
