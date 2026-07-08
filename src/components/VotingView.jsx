import { useState } from "react"
import { ROSTER } from "../constants.js"
import { castVoteToGithub } from "../github.js"
import { Avatar, Card, Button, Banner, Note, Spinner } from "./UI.jsx"
import styles from "./VotingView.module.css"

export default function VotingView({ voterName, monthKey, monthLabel, existingVote, onVoteCast }) {
  const [picked, setPicked] = useState(null)
  const [status, setStatus] = useState("idle") // idle | submitting | done | error
  const [errorMsg, setErrorMsg] = useState("")

  const candidates = ROSTER.filter(n => n !== voterName)
  const alreadyVoted = !!existingVote

  async function handleCast() {
    if (!picked || status === "submitting") return
    setStatus("submitting")
    setErrorMsg("")

    let attempts = 0
    while (attempts < 3) {
      const result = await castVoteToGithub(monthKey, voterName, picked)
      if (result.success) {
        setStatus("done")
        onVoteCast(picked)
        return
      }
      if (result.alreadyVoted) {
        setStatus("error")
        setErrorMsg("It looks like your vote was already recorded.")
        return
      }
      if (result.conflict) {
        // SHA conflict — retry with fresh read
        attempts++
        await new Promise(r => setTimeout(r, 400 * attempts))
        continue
      }
      setStatus("error")
      setErrorMsg(result.error || "Something went wrong. Please try again.")
      return
    }
    setStatus("error")
    setErrorMsg("Couldn't save your vote after several attempts. Please try again.")
  }

  if (alreadyVoted) {
    return (
      <Card>
        <Banner icon="✓">
          <span>You've already voted for <strong>{existingVote}</strong> for {monthLabel}. Thanks, {voterName.split(" ")[0]}!</span>
        </Banner>
        <p className={styles.sub}>Results will be shared once voting closes.</p>
      </Card>
    )
  }

  if (status === "done") {
    return (
      <Card className={styles.centerCard}>
        <div className={styles.bigCheck}>✓</div>
        <h2 className={styles.h2}>Vote recorded</h2>
        <p className={styles.sub}>
          Thanks, {voterName.split(" ")[0]}. Your vote for <strong>{picked}</strong> is in.
          Results will be shared once voting closes.
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <div className={styles.voterBadge}>
        <Avatar name={voterName} size={34} />
        <span className={styles.voterName}>Voting as <strong>{voterName}</strong></span>
      </div>

      <h2 className={styles.h2}>Cast your vote</h2>
      <p className={styles.sub}>
        Pick one teammate who made the biggest difference in {monthLabel}. You get one vote — and it can't go to yourself.
      </p>

      <div className={styles.grid}>
        {candidates.map(name => (
          <button
            key={name}
            className={`${styles.pick} ${picked === name ? styles.pickSelected : ""}`}
            aria-pressed={picked === name}
            onClick={() => setPicked(name)}
            disabled={status === "submitting"}
          >
            <Avatar name={name} size={38} />
            <span className={styles.nm}>{name}</span>
            <span className={styles.chk} aria-hidden>✓</span>
          </button>
        ))}
      </div>

      {status === "error" && (
        <Note variant="magenta">{errorMsg}</Note>
      )}

      {status === "submitting" ? (
        <Spinner />
      ) : (
        <div className={styles.actions}>
          <Button
            variant="primary"
            block
            disabled={!picked}
            onClick={handleCast}
          >
            {picked ? `Cast vote for ${picked}` : "Select someone to vote"}
          </Button>
        </div>
      )}
    </Card>
  )
}
