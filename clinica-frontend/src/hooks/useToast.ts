export type ToastType = "success" | "error" | "warning";

export function useToast() {
  const showToast = (message: string, type: ToastType) => {
    window.dispatchEvent(new CustomEvent('addToast', { detail: { message, type } }));
  };

  return {
    success: (msg: string) => showToast(msg, 'success'),
    error: (msg: string) => showToast(msg, 'error'),
    warning: (msg: string) => showToast(msg, 'warning'),
  };
}
