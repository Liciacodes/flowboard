import { useEffect, useId, useRef } from "react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const messageId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border border-neutral-800 bg-neutral-950 p-5 text-white shadow-xl backdrop:bg-black/60"
    >
      <h2 id={titleId} className="text-base font-medium">
        {title}
      </h2>

      <p id={messageId} className="mt-2 text-sm leading-6 text-neutral-400">
        {message}
      </p>

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          autoFocus
          onClick={onCancel}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-800"
        >
          Cancel
        </button>

        <button
          type="button"
          onClick={onConfirm}
          className={
            danger
              ? "rounded-lg border border-red-900 bg-red-950 px-4 py-2 text-sm text-red-300 hover:bg-red-900"
              : "rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-neutral-200"
          }
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
