import React from 'react';

/**
 * Placeholder for content that is still loading.
 *
 * Most screens here rendered nothing and then everything, which shifts the
 * layout under the cashier and gives no sense of how long a wait will be. A
 * skeleton reserves the space up front, so the page stops jumping.
 *
 * The shimmer runs off `animate-shimmer`, and the app-wide animation-level
 * preference (utils/animationPreferences.js) already neutralises it at the
 * "off" level, so this needs no reduced-motion handling of its own.
 */
export const Skeleton = ({ className = '' }) => (
  <div className={`relative overflow-hidden rounded-md bg-surface-3 ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
  </div>
);

/** A block of stacked lines, for paragraph-ish content. */
export const SkeletonText = ({ lines = 3, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        className={`h-3.5 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
      />
    ))}
  </div>
);

/** Product grid placeholder, shaped like the tiles it stands in for. */
export const SkeletonTiles = ({ count = 12, className = '' }) => (
  <div className={`grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ${className}`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="rounded-xl border border-border bg-surface p-3">
        <Skeleton className="mb-2 h-16 w-full" />
        <Skeleton className="mb-1.5 h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    ))}
  </div>
);

/** Table placeholder: a header strip plus rows. */
export const SkeletonTable = ({ rows = 6, columns = 5, className = '' }) => (
  <div className={`overflow-hidden rounded-xl border border-border ${className}`}>
    <div className="flex gap-4 border-b border-border bg-surface-2 px-4 py-3">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-3 flex-1" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="flex gap-4 border-b border-border px-4 py-3 last:border-b-0">
        {Array.from({ length: columns }).map((_, c) => (
          <Skeleton key={c} className="h-3.5 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

export default Skeleton;
