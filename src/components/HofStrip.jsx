import { useState, useEffect } from "react"
import { Avatar } from "./UI.jsx"
import { portraitUrl } from "../constants.js"
import { getAllWinners } from "../supabase.js"
import HofModal from "./HofModal.jsx"
import styles from "./HofStrip.module.css"

export function Portrait({ name, size, style = {} }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <Avatar name={name} size={size} />
  return (
    <img
      src={portraitUrl(name)}
      alt={name}
      style={{
        width: size, height: size, borderRadius: '50%',
        objectFit: 'cover', objectPosition: 'center top',
        display: 'block', flexShrink: 0,
        ...style,
      }}
      onError={() => setFailed(true)}
    />
  )
}

const MAX_PAST = 4

export default function HofStrip() {
  const [winners, setWinners] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    getAllWinners().then(setWinners)
  }, [])

  if (!winners || winners.length === 0) return null

  const mostRecent = winners[0]
  const pastWinners = winners.slice(1)
  const isMultiple = pastWinners.length > 0
  const isCoWinner = mostRecent.winners.length > 1

  const visiblePast = pastWinners.slice(0, MAX_PAST)
  const overflow = pastWinners.length - MAX_PAST

  return (
    <>
      <div
        className={`${styles.strip} ${isMultiple ? styles.stripClickable : ""}`}
        onClick={isMultiple ? () => setModalOpen(true) : undefined}
        role={isMultiple ? "button" : undefined}
        tabIndex={isMultiple ? 0 : undefined}
        onKeyDown={isMultiple ? e => e.key === "Enter" && setModalOpen(true) : undefined}
        aria-label={isMultiple ? "View Hall of Fame" : undefined}
      >
        <div className={styles.winner}>
          <div className={`${styles.winnerFaces} ${isCoWinner ? styles.winnerFacesMulti : ""}`}>
            {mostRecent.winners.map(name => (
              <Portrait
                key={name}
                name={name}
                size={isCoWinner ? 42 : 50}
                style={{ border: '3px solid rgba(255,255,255,0.15)' }}
              />
            ))}
          </div>
          <div className={styles.winnerInfo}>
            <div className={styles.kicker}>{mostRecent.label} Winner</div>
            <div className={styles.name}>{mostRecent.winners.join(" & ")}</div>
            {mostRecent.featuredComment && (
              <div className={styles.comment}>{mostRecent.featuredComment}</div>
            )}
          </div>
        </div>

        {isMultiple && (
          <>
            <div className={styles.divider} />
            <div className={styles.right}>
              <span className={styles.pastLabel}>Past winners</span>
              <div className={styles.circles}>
                {visiblePast.map((w, i) => (
                  <div
                    key={w.month}
                    className={styles.pc}
                    style={i === 0 ? { marginLeft: 0 } : undefined}
                    title={w.winners.join(" & ")}
                  >
                    <Portrait name={w.winners[0]} size={28} />
                  </div>
                ))}
                {overflow > 0 && (
                  <div className={`${styles.pc} ${styles.pcMore}`}>
                    +{overflow}
                  </div>
                )}
              </div>
              <button
                className={styles.viewAll}
                onClick={e => { e.stopPropagation(); setModalOpen(true) }}
              >
                View all →
              </button>
            </div>
          </>
        )}
      </div>

      {modalOpen && (
        <HofModal winners={winners} onClose={() => setModalOpen(false)} />
      )}
    </>
  )
}
