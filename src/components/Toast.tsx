import { useToast } from '@/hooks/useToast';

export function Toast() {
  const message = useToast();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]" aria-live="polite">
      {message && (
        <p className="toast max-w-sm rounded-2xl bg-ink px-4 py-3 text-center font-semibold text-panel-hi shadow-lg" data-testid="toast">
          {message}
        </p>
      )}
    </div>
  );
}
