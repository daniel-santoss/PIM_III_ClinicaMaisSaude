import { useEffect } from "react";

export function useScrollBlock(shouldBlock: boolean | undefined | null) {
  useEffect(() => {
    if (!shouldBlock) return;

    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [shouldBlock]);
}
