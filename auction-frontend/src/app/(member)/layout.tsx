import { RouteGuard } from '@/components/guards/RouteGuard';

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  return <RouteGuard mode="member">{children}</RouteGuard>;
}
