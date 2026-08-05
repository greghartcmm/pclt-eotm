import { FrameBar } from "./UI.jsx"
import styles from "./VotingClosedScreen.module.css"

export default function VotingClosedScreen({ monthLabel }) {
  return (
    <div className={styles.root}>
      <FrameBar />
      <div className={styles.screen}>
        <div className={styles.content}>
          <div className={styles.eyebrow}>CoverMyMeds · PCLT Team</div>

          <div className={styles.iconWrap}>
            <div className={styles.iconGlow}>
              <svg className={styles.hourglass} width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 2h12M6 22h12M7 2c0 5 3 6.5 5 6.5S17 7 17 2M7 22c0-5 3-6.5 5-6.5S17 17 17 22" stroke="#FFB703" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9.5 5.5c.6 1.2 1.5 1.8 2.5 1.8s1.9-.6 2.5-1.8" stroke="#FFB703" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            </div>
          </div>

          <h1 className={styles.headline}>
            VOTING IS
            <span className={styles.accent}>CLOSED</span>
          </h1>

          <div className={styles.monthPill}>{monthLabel}</div>

          <p className={styles.body}>
            Stay tuned for the announcement of the winner of this prestigious award…
          </p>

          <div className={styles.divider} />
        </div>
      </div>
    </div>
  )
}
