'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export const PMD_PLATFORM_LOGO_SRC = '/assets/media/uploads/Paymydinelogo.png';
const PMD_PLATFORM_LOGO_FALLBACK_SRC = '/images/logo.png';

type PmdPlatformLogoProps = {
  className?: string;
  imgClassName?: string;
  fallbackSrc?: string;
};

export function PmdPlatformLogo({
  className,
  imgClassName,
  fallbackSrc = PMD_PLATFORM_LOGO_FALLBACK_SRC,
}: PmdPlatformLogoProps) {
  const [src, setSrc] = useState(PMD_PLATFORM_LOGO_SRC);
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  return (
    <div className={cn('pmd-platform-logo', className)} aria-label="PayMyDine">
      <img
        src={src}
        alt="PayMyDine"
        className={cn('h-auto max-h-16 w-auto max-w-[150px] object-contain sm:max-h-24 sm:max-w-[240px]', imgClassName)}
        loading="lazy"
        decoding="async"
        onError={() => {
          if (src !== fallbackSrc) {
            setSrc(fallbackSrc);
            return;
          }

          setHidden(true);
        }}
      />
    </div>
  );
}
