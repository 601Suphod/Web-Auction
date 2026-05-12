import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import AuctionClient from '@/components/pages/AuctionClient';
import { notFound } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { Auction } from '@/lib/types';

export default async function AuctionPage({ params }: { params: Promise<{ id: string }> }) {
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
      <AuctionClient initialAuction={auction} />
      <Footer />
    </main>
  );
}
