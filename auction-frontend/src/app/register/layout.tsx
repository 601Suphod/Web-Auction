import { PublicOnlyGuard } from '@/components/guards/PublicOnlyGuard';

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <PublicOnlyGuard>{children}</PublicOnlyGuard>;
}
