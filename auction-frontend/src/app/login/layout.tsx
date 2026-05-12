import { PublicOnlyGuard } from '@/components/guards/PublicOnlyGuard';

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <PublicOnlyGuard>{children}</PublicOnlyGuard>;
}
