import { FrameBar, Avatar } from "./UI.jsx"
import styles from "./CelebrationOverlay.module.css"

export default function CelebrationOverlay({ data, onClose }) {
  const { winners, featuredComment, voteCount, totalVotes, label } = data

  return (
    <div className={styles.overlay} onClick={onClose}>
      <button
        className={styles.closeBtn}
        onClick={e => { e.stopPropagation(); onClose() }}
        aria-label="Close"
      >
        ✕
      </button>
      <FrameBar />
      <div className={styles.content} onClick={e => e.stopPropagation()}>
        <p className={styles.eyebrow}>CoverMyMeds · PCLT Team</p>
        <h1 className={styles.title}>Employee of the Month</h1>
        <p className={styles.monthLabel}>{label}</p>
        <div className={styles.avatarRow}>
          {winners.map(name => (
            <Avatar key={name} name={name} size={80} />
          ))}
        </div>
        <p className={styles.winnerNames}>{winners.join(" & ")}</p>
        {featuredComment && (
          <p className={styles.comment}>"{featuredComment}"</p>
        )}
        <p className={styles.meta}>{voteCount} {voteCount === 1 ? "vote" : "votes"} · PCLT Team</p>
      </div>
      <FrameBar />
    </div>
  )
}
