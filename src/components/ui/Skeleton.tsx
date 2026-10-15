export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function KpiSkeleton() {
  return (
    <div className="card p-4">
      <Skeleton className="mb-3 h-3 w-24" />
      <Skeleton className="mb-2 h-9 w-32" />
      <Skeleton className="h-3 w-40" />
    </div>
  );
}
