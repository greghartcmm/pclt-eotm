import { useState } from "react"
import { ADMINS, TOKEN_MAP } from "../constants.js"
import styles from "./AdminHeaderStrip.module.css"

function getCloseLabel(monthKey) {
  const [year, mo] = monthKey.split('-').map(Number)
  return new Date(year, mo, 5).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function AdminHeaderStrip({ monthKey, isClosed }) {
  const [modalOpen, setModalOpen] = useState(false)
  const closeLabel = getCloseLabel(monthKey)
  const base = `${window.location.origin}${window.location.pathname}`

  return (
    <>
      <div className={styles.rainbow} />
      <div className={styles.strip}>
        <div className={styles.left}>
          <div className={styles.eyebrow}>CoverMyMeds · PCLT Team</div>
          <div className={styles.title}>
            Employee of the <em className={styles.amber}>Month</em> — Admin
          </div>
        </div>
        <div className={styles.right}>
          <div className={isClosed ? `${styles.pill} ${styles.pillClosed}` : styles.pill}>
            {!isClosed && <span className={styles.dot} />}
            {isClosed ? "Voting closed" : `Voting open · closes ${closeLabel}`}
          </div>
          <button className={styles.viewLink} onClick={() => setModalOpen(true)}>
            View voter page →
          </button>
        </div>
      </div>

      {modalOpen && (
        <div className={styles.backdrop} onClick={() => setModalOpen(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <span className={styles.modalTitle}>Open voter page</span>
              <button className={styles.modalClose} onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <p className={styles.modalSub}>Choose which admin ballot to open</p>
            <div className={styles.modalList}>
              {ADMINS.map(name => (
                <a
                  key={name}
                  href={`${base}?token=${TOKEN_MAP[name]}`}
                  className={styles.modalItem}
                  target="_blank"
                  rel="noreferrer"
                >
                  {name}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
