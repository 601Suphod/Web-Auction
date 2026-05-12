import { RouteGuard } from '@/components/guards/RouteGuard';

export default function AdminGroupLayout({ children }: { children: React.ReactNode }) {
  return <RouteGuard mode="admin">{children}</RouteGuard>;
}
