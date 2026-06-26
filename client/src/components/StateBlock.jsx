import React from 'react';
import clsx from 'clsx';
import { Inbox, CloudOff } from 'lucide-react';

/**
 * Unified empty / error state. Replaces the old scattered
 * `text-center text-gray-400 py-*` divs across the prices grid, chart,
 * Dynamics and history table so every "nothing to show" / "fetch failed"
 * surface speaks one visual language: muted icon + single copy line, optional
 * hint, optional recovery action.
 *
 * variant: 'empty' (neutral grey — query returned nothing)
 *          'error' (amber — fetch failed / showing stale data)
 * size:    'sm' (py-6, dense subsections) | 'md' (py-10, full cards)
 * action:  { label, onClick, icon?: Icon, loading?: bool } — optional CTA
 */
export default function StateBlock({
  variant = 'empty',
  icon: Icon,
  message,
  hint,
  action,
  size = 'md',
  className,
}) {
  const isError = variant === 'error';
  const IconCmp = Icon || (isError ? CloudOff : Inbox);
  const ActionIcon = action?.icon;

  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center text-center',
        size === 'sm' ? 'py-6 gap-1.5' : 'py-10 gap-2',
        className,
      )}
    >
      <IconCmp
        className={clsx(
          size === 'sm' ? 'w-5 h-5' : 'w-6 h-6',
          isError ? 'text-amber-500' : 'text-gray-300',
        )}
        strokeWidth={1.75}
      />
      <p className={clsx('text-sm font-medium', isError ? 'text-amber-800' : 'text-gray-400')}>
        {message}
      </p>
      {hint && (
        <p className="text-[11px] sm:text-xs text-gray-400 max-w-[34ch] leading-relaxed">{hint}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          disabled={action.loading}
          className={clsx(
            'mt-1 inline-flex items-center gap-1.5 text-xs font-semibold rounded-lg px-3 py-1.5 border active:scale-95 transition-all disabled:opacity-50',
            isError
              ? 'border-amber-200 text-amber-800 hover:bg-amber-50'
              : 'border-gray-200 text-gray-600 hover:bg-gray-50',
          )}
        >
          {ActionIcon && <ActionIcon className={clsx('w-3.5 h-3.5', action.loading && 'animate-spin')} />}
          {action.label}
        </button>
      )}
    </div>
  );
}
