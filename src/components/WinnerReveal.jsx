import { useEffect, useMemo, useState } from "react"
import { Portrait } from "./HofStrip.jsx"
import styles from "./WinnerReveal.module.css"

export const COMMENT_DWELL_MS = 2750

function useCyclingComments(comments, controlledIndex) {
  const [index, setIndex] = useState(0)
  const isControlled = controlledIndex != null

  useEffect(() => {
    if (isControlled) return
    setIndex(0)
    if (comments.length < 2) return
    const id = setInterval(() => {
      setIndex(i => (i + 1) % comments.length)
    }, COMMENT_DWELL_MS)
    return () => clearInterval(id)
  }, [comments, isControlled])

  return isControlled ? controlledIndex : index
}

function useConfetti() {
  return useMemo(() => {
    const colors = ['#FFB703', '#FB8500', '#219EBC', '#8ECAE6', '#E70865']
    return Array.from({ length: 14 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 14 + Math.random() * 0.4
      const dist = 140 + Math.random() * 100
      return {
        id: i,
        color: colors[i % colors.length],
        dx: Math.round(Math.cos(angle) * dist),
        dy: Math.round(Math.sin(angle) * dist - 30),
        rot: Math.round(Math.random() * 360),
        delay: +(Math.random() * 0.15).toFixed(3),
      }
    })
  }, [])
}

export default function WinnerReveal({
  winner,
  isPreview,
  onDismiss,
  cardRef,
  controlledIndex,
  onRecordGif,
  recording,
  recordStatus,
  hideCta,
}) {
  const confetti = useConfetti()
  const comments = useMemo(
    () => (winner.comments && winner.comments.length > 0
      ? winner.comments
      : (winner.featuredComment ? [winner.featuredComment] : [])),
    [winner]
  )
  const index = useCyclingComments(comments, controlledIndex)
  const activeComment = comments[index]
  const names = winner.winners
  const firstNames = names.map(n => n.split(' ')[0])
  const headline = firstNames.length > 1
    ? `Congrats, ${firstNames.join(' & ')}!`
    : `Congrats, ${firstNames[0]}!`

  return (
    <div className={styles.overlay} onClick={onDismiss}>
      <div
        className={`${styles.card} ${isPreview ? styles.cardPreview : ""} ${recording ? styles.recordingMode : ""}`}
        onClick={e => e.stopPropagation()}
        ref={cardRef}
      >
        {confetti.map(c => (
          <div
            key={c.id}
            className={styles.confetti}
            style={{
              background: c.color,
              '--dx': `${c.dx}px`,
              '--dy': `${c.dy}px`,
              '--rot': `${c.rot}deg`,
              animationDelay: `${c.delay}s`,
            }}
          />
        ))}

        <button className={styles.close} onClick={onDismiss} aria-label="Close">✕</button>

        <div className={styles.portraitWrap}>
          <div className={styles.ring} />
          <div className={`${styles.portraits} ${names.length > 1 ? styles.portraitsMulti : ""}`}>
            {names.map(name => (
              <Portrait
                key={name}
                name={name}
                size={names.length > 1 ? 210 : 320}
                style={{ border: '6px solid #FFB703', position: 'relative', zIndex: 1 }}
              />
            ))}
          </div>
        </div>

        <div className={styles.kicker}>
          {isPreview ? '🎲' : '🎉'} {winner.label} Winner
        </div>

        <div className={styles.headline}>{headline}</div>

        {activeComment && (
          <div
            key={index}
            className={styles.comment}
            // A single capture can otherwise land mid-fade — freeze it at
            // full opacity instead of relying on the class-based override,
            // which html2canvas doesn't reliably resolve when cloning the DOM.
            style={recording ? { animation: "none", opacity: 1 } : undefined}
          >
            {activeComment}
          </div>
        )}

        {!hideCta && (
          <button className={styles.cta} onClick={onDismiss}>
            Let's vote →
          </button>
        )}

        {onRecordGif && (
          <button className={styles.recordBtn} onClick={onRecordGif} disabled={recording}>
            {recording ? (recordStatus || "Recording…") : "🎬 Save video for Teams"}
          </button>
        )}
      </div>
    </div>
  )
}
