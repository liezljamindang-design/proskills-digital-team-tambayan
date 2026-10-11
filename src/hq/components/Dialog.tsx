import { useEffect, useRef, type ReactNode } from "react";

/** Thin wrapper over the native modal dialog, which handles focus trapping and Esc for us. */
export function Dialog({
  open,
  onClose,
  labelledBy,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog ref={ref} className="dialog" aria-labelledby={labelledBy} onClose={onClose}>
      {children}
    </dialog>
  );
}
