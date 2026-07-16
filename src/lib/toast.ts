/** Minimal pub-sub toast bus — UI lives in components/Toaster.tsx. */
export type ToastKind = "success" | "error";

type Listener = (msg: string, kind: ToastKind) => void;

let listener: Listener | null = null;

export function setToastListener(l: Listener | null): void {
  listener = l;
}

export function toast(msg: string, kind: ToastKind = "success"): void {
  listener?.(msg, kind);
}
