"use client";

import { useEffect, useMemo } from "react";

/** An object URL for a Blob, revoked once the component no longer uses it. */
export function useBlobUrl(blob: Blob | undefined): string | null {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  return url;
}
