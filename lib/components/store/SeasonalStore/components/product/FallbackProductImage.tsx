'use client';

import React, { useEffect, useState } from 'react';

/** Placeholder already used when a product has no image. */
export const EMPTY_PRODUCT_IMAGE_URL =
  'https://assets-2-prod.whop.com/uploads/user_16843562/image/experiences/2025-10-24/e6822e55-e666-43de-aec9-e6e116ea088f.webp';

export function FallbackProductImage({
  src,
  className = 'absolute inset-0 h-full w-full object-cover',
}: {
  src?: string | null;
  className?: string;
}) {
  const [current, setCurrent] = useState(src || EMPTY_PRODUCT_IMAGE_URL);

  useEffect(() => {
    setCurrent(src || EMPTY_PRODUCT_IMAGE_URL);
  }, [src]);

  return (
    <img
      src={current}
      alt=""
      className={className}
      onError={() => {
        setCurrent((previous) =>
          previous === EMPTY_PRODUCT_IMAGE_URL ? previous : EMPTY_PRODUCT_IMAGE_URL,
        );
      }}
    />
  );
}
