import { useState } from "react"
import { ROSTER } from "../constants.js"
import { castVote } from "../supabase.js"
import { Avatar, Card, Button, Note, Spinner } from "./UI.jsx"
import styles from "./VotingView.module.css"

export default function VotingView({ voterName, monthKey, monthLabel, existingVote, onVoteCast }) {
  const [picked, setPicked]           = useState(existingVote || null)
  const [confirmedVote, setConfirmed] = useState(existingVote || null)
  const [status, setStatus]           = useState("idle")
  const [errorMsg, setErrorMsg]       = useState("")

  const candidates  = ROSTER.filter(n => n !== voterName)
  const isChanging  = !!confirmedVote
  const hasNewPick  = picked !== confirmedVote

  async function handleCast() {
    if (!picked || status === "submitting") return
    setStatus("submitting")
    setErrorMsg("")

    const result = await castVote(monthKey, voterName, picked)

    if (result.success) {
      setConfirmed(picked)
      setStatus("done")
      onVoteCast(picked)
    } else {
      setStatus("error")
      setErrorMsg(result.error || "Something went wrong. Please try again.")
    }
  }

  function buttonLabel() {
    if (!picked)       return "Select someone to vote"
    if (!isChanging)   return `Cast vote for ${picked}`
    if (!hasNewPick)   return `Your vote: ${picked}`
    return `Change vote to ${picked}`
  }

  return (
    <Card>
      <div className={styles.voterBadge}>
        <Avatar name={voterName} size={34} />
        <span className={styles.voterName}>Voting as <strong>{voterName}</strong></span>
      </div>

      <h2 className={styles.h2}>{isChanging ? "Change your vote" : "Cast your vote"}</h2>
      <p className={styles.sub}>
        {isChanging
          ? `You voted for ${confirmedVote}. Select someone below to change your vote.`
          : `Pick one teammate who made the biggest difference in ${monthLabel}. You get one vote — and it can't go to yourself.`
        }
      </p>

      {status === "done" && (
        <div className={styles.successBanner}>
          <span className={styles.successIcon}>✓</span>
          {confirmedVote !== picked
            ? `Vote updated — you're now voting for ${picked}.`
            : `Vote recorded for ${picked}. Thanks, ${voterName.split(" ")[0]}!`
          }
        </div>
      )}

      <div className={styles.grid}>
        {candidates.map(name => {
          const isSelected = picked === name
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

      {status === "submitting" ? <Spinner /> : (
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
