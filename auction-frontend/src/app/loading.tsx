import Navbar from '@/components/Navbar';
import { PageSkeleton } from '@/components/ui/PageSkeleton';

export default function Loading() {
  return (
    <main className="page-bg min-h-screen">
      <Navbar />
      <PageSkeleton />
    </main>
  );
}
