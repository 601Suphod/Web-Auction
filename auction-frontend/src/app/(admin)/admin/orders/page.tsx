import Navbar from '@/components/Navbar';
import AdminOrdersClient from '@/components/pages/AdminOrdersClient';
import { apiGet } from '@/lib/api';
import { Profile } from '@/lib/types';
import { redirect } from 'next/navigation';

export default async function AdminOrdersPage() {
  try {
    const profile = (await apiGet('/users/me')) as Profile;
    if (profile.role !== 'ADMIN') redirect('/');
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message.includes('กรุณาเข้าสู่ระบบ') || message.includes('401')) {
      redirect('/login?next=/admin/orders');
    }
  }

  return (
    <main className="min-h-screen page-bg">
      <Navbar />
      <AdminOrdersClient />
    </main>
  );
}
