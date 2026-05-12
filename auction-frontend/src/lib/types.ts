export interface Bid {
  id: string;
  userId: string;
  amount: number;
  createdAt: string;
  auctionId?: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  images: string[];
  status: string;
  sellerId?: string;
  startPrice?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Auction {
  id: string;
  product: Product;
  startAt: string;
  endAt: string;
  currentBid: number;
  status: string;
  bids: Bid[];
  serverNow: string;
  winnerId?: string | null;
  bidCount?: number;
  minNextBid?: number;
}

export interface Profile {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  role: string;
  verified?: boolean;
  provider?: string;
  createdAt?: string;
  bidHistory: Array<Bid & { productTitle?: string | null }>;
  wins: Array<Auction & { product?: { id: string; title: string; images: string[] } | null }>;
}

export interface AdminOverview {
  stats: {
    totalUsers: number;
    totalOrders: number;
    totalReports: number;
    pendingProducts: number;
    liveAuctions: number;
    totalAuctions: number;
    paidOrders: number;
    shippedOrders: number;
    pendingPayments: number;
    totalRevenue: number;
  };
  pendingProducts: Product[];
  recentOrders: Array<{
    id: string;
    status: string;
    amount: number;
    createdAt: string;
    productTitle: string;
    buyerName: string;
  }>;
}

export interface Shipment {
  id: string;
  orderId: string;
  trackingNumber: string;
  status: string;
}

export interface SellerDashboard {
  summary: {
    totalListings: number;
    liveAuctions: number;
    soldListings: number;
    grossRevenue: number;
  };
  products: Product[];
  auctions: Auction[];
  pagination: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export interface PaginatedAuctions {
  items: Auction[];
  pagination: PaginationMeta;
}

export interface AdminProductsResponse {
  items: Product[];
  pagination: PaginationMeta;
}

export interface Payment {
  id: string;
  orderId: string;
  provider: string;
  amount: number;
  status: string;
  providerRef?: string;
  slipNote?: string;
  rejectedReason?: string;
  createdAt?: string;
}

export interface AdminPaymentRecord extends Payment {
  order: { id: string; status: string; amount: number } | null;
  product: { id: string; title: string; images: string[] } | null;
  buyer: { id: string; name: string; email: string; phone?: string } | null;
}

export interface AdminPaymentsResponse {
  items: AdminPaymentRecord[];
  pagination: PaginationMeta;
}

export interface OrderRecord {
  id: string;
  auctionId: string;
  buyerId: string;
  amount: number;
  status: string;
  createdAt?: string;
  product: Product | null;
  auction: Auction | null;
  shipment: Shipment | null;
  payment?: Payment | null;
}

export interface AdminOrderRecord extends OrderRecord {
  buyer: { id: string; name: string; email: string } | null;
}

export interface AdminOrdersResponse {
  items: AdminOrderRecord[];
  pagination: PaginationMeta;
}

export interface TrackingResult {
  shipment: Shipment & { createdAt?: string; updatedAt?: string };
  order: OrderRecord | null;
  product: { id: string; title: string; images: string[] } | null;
}
