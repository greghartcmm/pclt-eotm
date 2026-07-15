import { useState } from "react"
import { Avatar, Button } from "./UI.jsx"
import styles from "./DeclareWinnerModal.module.css"

export default function DeclareWinnerModal({
  monthLabel,
  entries,
  max,
  reasonsByChoice,
  currentWinner,
  onSave,
  onClose,
}) {
  const [selected, setSelected] = useState(() => {
    if (currentWinner) return currentWinner.winners
    return entries.filter(([, c]) => c === max).map(([n]) => n)
  })
  const [featuredComment, setFeaturedComment] = useState(
    currentWinner?.featured_comment || null
  )
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")

  function toggleSelect(name) {
    setSelected(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    )
    setFeaturedComment(null)
  }

  const allReasons = selected.flatMap(name =>
    (reasonsByChoice[name] || []).map(reason => ({ reason, name }))
  )
  const showStep2 = selected.length > 0 && allReasons.length > 0

  async function handleSave() {
    setSaving(true)
    setSaveError("")
    try {
      await onSave(selected, featuredComment)
    } catch (e) {
      setSaveError(e.message)
      setSaving(false)
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.title}>
            {currentWinner ? "Edit winner" : "Declare winner"} — {monthLabel}
          </h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <p className={styles.stepLabel}>1 · Select winner(s)</p>

        <div className={styles.candidateGrid}>
          {entries.map(([name, count]) => {
            const isSelected = selected.includes(name)
            const isLead = count === max
            return (
              <div
                key={name}
                className={`${styles.candidateCard} ${isSelected ? styles.cardSelected : ""}`}
                onClick={() => toggleSelect(name)}
              >
                <Avatar name={name} size={36} />
                <span className={styles.cardName}>
                  {isLead && <span className={styles.star}>★ </span>}
                  {name}
                </span>
                <span className={styles.cardCount}>
                  {count} {count === 1 ? "vote" : "votes"}
                </span>
              </div>
            )
          })}
        </div>

        {selected.length > 1 && (
          <p className={styles.cowinnerNote}>
            Co-winners selected: {selected.join(" & ")}
          </p>
        )}

        {showStep2 && (
          <>
            <p className={styles.stepLabel}>2 · Feature a comment (optional)</p>
            <div className={styles.commentGrid}>
              <div
                className={`${styles.commentCard} ${featuredComment === null ? styles.cardSelected : ""}`}
                onClick={() => setFeaturedComment(null)}
              >
                None
              </div>
              {allReasons.map(({ reason, name }, i) => (
                <div
                  key={i}
                  className={`${styles.commentCard} ${featuredComment === reason ? styles.cardSelected : ""}`}
                  onClick={() => setFeaturedComment(reason)}
                >
                  {selected.length > 1 && (
                    <span className={styles.commentAttr}>re: {name.split(" ")[0]}</span>
                  )}
                  <span className={styles.commentText}>"{reason}"</span>
                </div>
              ))}
            </div>
          </>
        )}

        {saveError && <p className={styles.error}>{saveError}</p>}

        <div className={styles.actions}>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving || selected.length === 0}
          >
            {saving ? "Saving…" : currentWinner ? "Update winner" : "Declare winner"}
          </Button>
        </div>
      </div>
    </div>
  )
}
