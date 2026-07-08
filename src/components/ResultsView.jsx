import { useEffect, useRef } from "react"
import { ROSTER } from "../constants.js"
import { Avatar, Card } from "./UI.jsx"
import styles from "./ResultsView.module.css"

export default function ResultsView({ votes, monthLabel, totalEligible }) {
  const barsRef = useRef(null)

  // Tally votes for this month
  const counts = {}
  ROSTER.forEach(n => (counts[n] = 0))
  Object.values(votes || {}).forEach(choice => {
    if (counts.hasOwnProperty(choice)) counts[choice]++
  })

  const entries = Object.entries(counts)
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])

  const totalVotes = Object.keys(votes || {}).length
  const turnout = Math.round((totalVotes / totalEligible) * 100)
  const max = entries.length ? entries[0][1] : 0
  const leaders = entries.filter(([, c]) => c === max && max > 0).map(([n]) => n)

  useEffect(() => {
    // Animate bars after mount
    const fills = barsRef.current?.querySelectorAll("[data-fill]")
    if (!fills) return
    requestAnimationFrame(() => {
      fills.forEach(el => {
        el.style.width = el.dataset.fill + "%"
      })
    })
  }, [votes])

  function leadText() {
    if (leaders.length === 0 || max === 0) return "No votes recorded yet."
    if (leaders.length === 1) return `${leaders[0]} is in the lead.`
    if (leaders.length === 2) return `${leaders[0]} and ${leaders[1]} are tied.`
    return `${leaders.slice(0, -1).join(", ")} and ${leaders.at(-1)} are tied.`
  }

  return (
    <Card>
      <h2 className={styles.h2}>Live results — {monthLabel}</h2>
      <p className={styles.sub}>{leadText()}</p>

      <div className={styles.stats}>
        <Stat n={totalVotes} label="Votes cast" />
        <Stat n={totalEligible} label="Eligible" />
        <Stat n={`${turnout}%`} label="Turnout" />
      </div>

      <div className={styles.bars} ref={barsRef}>
        {entries.length === 0 && (
          <p className={styles.empty}>No votes yet — results will appear here as people vote.</p>
        )}
        {entries.map(([name, count]) => {
          const isLead = count === max && max > 0
          const pct = max ? Math.round((count / max) * 100) : 0
          return (
            <div key={name} className={`${styles.barRow} ${isLead ? styles.lead : ""}`}>
              <div className={styles.barTop}>
                <span className={styles.barName}>
                  {isLead && <span className={styles.crown}>★</span>}
                  {name}
                </span>
                <span className={styles.barVal}>{count} {count === 1 ? "vote" : "votes"}</span>
              </div>
              <div className={styles.track}>
                <div
                  className={styles.fill}
                  data-fill={pct}
                  style={{ width: 0, transition: "width .5s cubic-bezier(.2,.8,.2,1)" }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {leaders.length > 1 && max > 0 && (
        <div className={styles.tieNote}>
          🏆 Tie: Co-winners will be declared — {leaders.join(" & ")}
        </div>
      )}
    </Card>
  )
}

function Stat({ n, label }) {
  return (
    <div className={styles.stat}>
      <div className={styles.statN}>{n}</div>
      <div className={styles.statL}>{label}</div>
    </div>
  )
}
