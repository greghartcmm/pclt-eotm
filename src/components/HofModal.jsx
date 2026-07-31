import { useState } from "react"
import { Avatar } from "./UI.jsx"
import { portraitUrl } from "../constants.js"
import styles from "./HofModal.module.css"

function Portrait({ name, size, style = {} }) {
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

export default function HofModal({ winners, onClose }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>
            Hall of <em className={styles.titleAmber}>Fame</em>
          </div>
          <button className={styles.close} onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className={styles.body}>
          {winners.map(({ month, label, winners: names, voteCount, featuredComment }) => (
            <div key={month} className={styles.row}>
              <div className={`${styles.portraits} ${names.length > 1 ? styles.portraitsMulti : ""}`}>
                {names.map(name => (
                  <Portrait
                    key={name}
                    name={name}
                    size={names.length > 1 ? 50 : 60}
                    style={{ border: '3px solid #E4ECF0' }}
                  />
                ))}
              </div>
              <div className={styles.info}>
                <div className={styles.rowMonth}>{label}</div>
                <div className={styles.rowName}>{names.join(" & ")}</div>
                <div className={styles.rowMeta}>{voteCount} vote{voteCount === 1 ? "" : "s"} · PCLT Team</div>
                {featuredComment && (
                  <div className={styles.rowComment}>{featuredComment}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
