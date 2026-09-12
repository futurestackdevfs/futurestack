"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";

type SafeImageProps = Omit<ImageProps, "onError"> & {
  /** Shown after the source fails even when loaded unoptimized. */
  fallbackSrc?: string;
};

/**
 * `next/image` optimizes remote images by fetching them from the Next server.
 * When that fetch fails (unreachable host / DNS / 404 / timeout) the plain
 * `<Image>` renders nothing and floods the logs. `SafeImage` degrades instead:
 *
 *  1. first error  -> retry with `unoptimized` (browser loads the URL directly)
 *  2. second error -> swap to `fallbackSrc`
 */
export function SafeImage({
  src,
  fallbackSrc = "/images/logo.png",
  unoptimized,
  ...rest
}: SafeImageProps) {
  const [stage, setStage] = useState<0 | 1 | 2>(0);

  // Reset when the source changes (recycled list rows).
  useEffect(() => {
    setStage(0);
  }, [src]);

  const currentSrc = stage === 2 ? fallbackSrc : src;

  return (
    <Image
      {...rest}
      src={currentSrc}
      unoptimized={unoptimized || stage >= 1}
      onError={() => setStage((s) => (s < 2 ? ((s + 1) as 0 | 1 | 2) : s))}
    />
  );
}

export default SafeImage;
