import { Skeleton } from '@/components/ui/Skeleton';

export function PageSkeleton() {
  return (
    <section className="section-shell py-10 lg:py-14">
      <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div className="glass-panel rounded-[30px] p-7">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="mt-6 h-12 w-full max-w-xl" />
          <Skeleton className="mt-3 h-5 w-full max-w-2xl" />
          <Skeleton className="mt-2 h-5 w-4/5" />
        </div>
        <div className="glass-panel rounded-[30px] p-7">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="mt-6 h-12 w-full" />
          <Skeleton className="mt-4 h-12 w-full" />
          <Skeleton className="mt-4 h-12 w-full" />
          <Skeleton className="mt-6 h-12 w-full rounded-full" />
        </div>
      </div>
    </section>
  );
}
