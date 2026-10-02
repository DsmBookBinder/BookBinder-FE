import { useEffect, type FormEvent, type ReactNode } from "react";

/** 확인/취소가 있는 폼 모달. Esc와 바깥 클릭으로 닫힌다. */
export function Modal({
  title,
  submitLabel,
  onSubmit,
  onClose,
  children,
}: {
  title: string;
  submitLabel: string;
  onSubmit: () => void;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="card modal" role="dialog" aria-modal="true" aria-label={title} onSubmit={handleSubmit}>
        <h2 className="modal__title">{title}</h2>
        {children}
        <div className="modal__actions">
          <button type="button" className="btn btn--sm" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="btn btn--sm btn--primary">
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
