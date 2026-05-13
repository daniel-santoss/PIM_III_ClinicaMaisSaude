import { useEffect } from "react";

export function useScrollBlock(shouldBlock: boolean | undefined | null) {
  useEffect(() => {
    if (shouldBlock) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [shouldBlock]);
}
