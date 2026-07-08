import { useState } from "react"
import { ROSTER } from "../constants.js"
import { castVoteToGithub } from "../github.js"
import { Avatar, Card, Button, Note, Spinner } from "./UI.jsx"
import styles from "./VotingView.module.css"

export default function VotingView({ voterName, monthKey, monthLabel, existingVote, onVoteCast }) {
  const [picked, setPicked] = useState(existingVote || null)
  const [status, setStatus] = useState("idle") // idle | submitting | done | error
  const [errorMsg, setErrorMsg] = useState("")
  const [confirmedVote, setConfirmedVote] = useState(existingVote || null)

  const candidates = ROSTER.filter(n => n !== voterName)
  const isChanging = !!confirmedVote
  const hasNewPick = picked !== confirmedVote

  async function handleCast() {
    if (!picked || status === "submitting") return
    setStatus("submitting")
    setErrorMsg("")

    let attempts = 0
    while (attempts < 3) {
      const result = await castVoteToGithub(monthKey, voterName, picked, isChanging)
      if (result.success) {
        setConfirmedVote(picked)
        setStatus("done")
        onVoteCast(picked)
        return
      }
      if (result.conflict) {
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

  function buttonLabel() {
    if (!picked) return "Select someone to vote"
    if (!isChanging) return `Cast vote for ${picked}`
    if (!hasNewPick) return `Your vote: ${picked}`
    return `Change vote to ${picked}`
  }

  const showDone = status === "done"

  return (
    <Card>
      <div className={styles.voterBadge}>
        <Avatar name={voterName} size={34} />
        <span className={styles.voterName}>Voting as <strong>{voterName}</strong></span>
      </div>

      <h2 className={styles.h2}>
        {isChanging ? "Change your vote" : "Cast your vote"}
      </h2>
      <p className={styles.sub}>
        {isChanging
          ? `You voted for ${confirmedVote}. Select someone below to change your vote.`
          : `Pick one teammate who made the biggest difference in ${monthLabel}. You get one vote — and it can't go to yourself.`
        }
      </p>

      {showDone && (
        <div className={styles.successBanner}>
          <span className={styles.successIcon}>✓</span>
          {isChanging && picked !== confirmedVote
            ? `Vote updated — you're now voting for ${picked}.`
            : `Vote recorded for ${picked}. Thanks, ${voterName.split(" ")[0]}!`
          }
        </div>
      )}

      <div className={styles.grid}>
        {candidates.map(name => {
          const isSelected = picked === name
          const wasVoted = confirmedVote === name && !hasNewPick
          return (
            <button
              key={name}
              className={`${styles.pick} ${isSelected ? styles.pickSelected : ""}`}
              aria-pressed={isSelected}
              onClick={() => { setPicked(name); setStatus("idle"); setErrorMsg("") }}
              disabled={status === "submitting"}
            >
              <Avatar name={name} size={38} />
              <span className={styles.nm}>{name}</span>
              <span className={styles.chk} aria-hidden>✓</span>
            </button>
          )
        })}
      </div>

      {status === "error" && <Note variant="magenta">{errorMsg}</Note>}

      {status === "submitting" ? (
        <Spinner />
      ) : (
        <div className={styles.actions}>
          <Button
            variant="primary"
            block
            disabled={!picked || !hasNewPick}
            onClick={handleCast}
          >
            {buttonLabel()}
          </Button>
        </div>
      )}
    </Card>
  )
}
