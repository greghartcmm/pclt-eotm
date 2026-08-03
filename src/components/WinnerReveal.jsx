import { useMemo } from "react"
import { Portrait } from "./HofStrip.jsx"
import styles from "./WinnerReveal.module.css"

function useConfetti() {
  return useMemo(() => {
    const colors = ['#FFB703', '#FB8500', '#219EBC', '#8ECAE6', '#E70865']
    return Array.from({ length: 14 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 14 + Math.random() * 0.4
      const dist = 90 + Math.random() * 70
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

export default function WinnerReveal({ winner, isPreview, onDismiss }) {
  const confetti = useConfetti()
  const names = winner.winners
  const firstNames = names.map(n => n.split(' ')[0])
  const headline = firstNames.length > 1
    ? `Congrats, ${firstNames.join(' & ')}!`
    : `Congrats, ${firstNames[0]}!`

  return (
    <div className={styles.overlay} onClick={onDismiss}>
      <div
        className={`${styles.card} ${isPreview ? styles.cardPreview : ""}`}
        onClick={e => e.stopPropagation()}
      >
        {isPreview && (
          <div className={styles.previewBadge}>Preview — not a real announcement</div>
        )}

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
                size={names.length > 1 ? 90 : 116}
                style={{ border: '5px solid #FFB703', position: 'relative', zIndex: 1 }}
              />
            ))}
          </div>
        </div>

        <div className={styles.kicker}>
          {isPreview ? '🎲' : '🎉'} {winner.label} Winner
        </div>

        <div className={styles.headline}>{headline}</div>

        {winner.featuredComment && (
          <div className={styles.comment}>{winner.featuredComment}</div>
        )}

        <button className={styles.cta} onClick={onDismiss}>
          Let's vote →
        </button>
      </div>
    </div>
  )
}
