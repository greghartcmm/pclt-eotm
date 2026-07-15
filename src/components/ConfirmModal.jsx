import { Button } from "./UI.jsx"
import styles from "./ConfirmModal.module.css"

export default function ConfirmModal({
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  variant = "danger",
  loading,
  error,
  onConfirm,
  onCancel,
}) {
  return (
    <div className={styles.backdrop} onClick={onCancel}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.body}>{body}</p>
        {error && <p className={styles.error}>{error}</p>}
        <div className={styles.actions}>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm} disabled={loading}>
            {loading ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
