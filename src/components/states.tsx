import { Button } from "@/components/ui/button.tsx";

export function Skeleton({ width = "100%", height = 20 }: { width?: string | number; height?: number }) {
  return <div className="skeleton" style={{ width, height }} aria-hidden="true" />;
}

export function SkeletonRows({ count, height = 44 }: { count: number; height?: number }) {
  return (
    <div className="rows" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex items-center" style={{ height }}>
          <Skeleton width="60%" height={16} />
        </div>
      ))}
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-dashed border-control px-4 py-3">
      <span>{message}</span>
      <Button variant="ghost" size="sm" onClick={onRetry}>
        Retry
      </Button>
    </div>
  );
}
