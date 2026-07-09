import { useState, useEffect } from "react"
import { ROSTER } from "../constants.js"
import { castVote } from "../supabase.js"
import { Avatar, Card, Button, Note, Spinner } from "./UI.jsx"
import styles from "./VotingView.module.css"

const MAX_REASON = 80

export default function VotingView({ voterName, monthKey, monthLabel, existingVote, isClosed, onVoteCast }) {
  const [picked, setPicked]         = useState(existingVote || null)
  const [confirmedVote, setConfirmed] = useState(existingVote || null)
  const [status, setStatus]         = useState("idle")
  const [errorMsg, setErrorMsg]     = useState("")
  const [reason, setReason]         = useState("")
  const [sheetOpen, setSheetOpen]   = useState(false)
  const [isMobile, setIsMobile]     = useState(false)

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 600px)")
    setIsMobile(mq.matches)
    const handler = e => setIsMobile(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  const candidates = ROSTER.filter(n => n !== voterName)
  const isChanging = !!confirmedVote
  const hasNewPick = picked !== confirmedVote

  if (isClosed) {
    return (
      <Card>
        <div className={styles.closedIcon}>🔒</div>
        <h2 className={styles.h2}>Voting is closed</h2>
        <p className={styles.sub}>
          Voting for <strong>{monthLabel}</strong> closed on the 5th at 5pm ET.
          The next round opens soon — check back after the 5th!
        </p>
      </Card>
    )
  }

  function handlePick(name) {
    setPicked(name)
    setStatus("idle")
    setErrorMsg("")
    setReason("")
    if (isMobile) setSheetOpen(true)
  }

  async function handleCast(reasonText) {
    if (!picked || status === "submitting") return
    setStatus("submitting")
    setErrorMsg("")
    const result = await castVote(monthKey, voterName, picked, reasonText || null)
    if (result.success) {
      setConfirmed(picked)
      setStatus("done")
      setSheetOpen(false)
      onVoteCast(picked)
    } else {
      setStatus("error")
      setErrorMsg(result.error || "Something went wrong. Please try again.")
    }
  }

  function buttonLabel() {
    if (!picked)     return "Select someone to vote"
    if (!isChanging) return `Cast vote for ${picked}`
    if (!hasNewPick) return `Your vote: ${picked}`
    return `Change vote to ${picked}`
  }

  return (
    <>
      <Card>
        <div className={styles.voterBadge}>
          <Avatar name={voterName} size={34} />
          <span className={styles.voterName}>Voting as <strong>{voterName}</strong></span>
        </div>

        <h2 className={styles.h2}>{isChanging ? "Change your vote" : `Welcome, ${voterName.split(" ")[0]} 👋`}</h2>
        <p className={styles.sub}>
          {isChanging
            ? `You voted for ${confirmedVote}. Select someone below to change your vote.`
            : `Pick one teammate. You can't vote for yourself.`
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
                onClick={() => handlePick(name)}
                disabled={status === "submitting"}
              >
                <Avatar name={name} size={38} />
                <span className={styles.nm}>{name}</span>
                <span className={styles.chk} aria-hidden>✓</span>
              </button>
            )
          })}
        </div>

        {/* Desktop: inline reason field appears after picking */}
        {!isMobile && picked && hasNewPick && (
          <div className={styles.reasonInline}>
            <label className={styles.reasonLabel}>
              Why {picked.split(" ")[0]}?
              <span className={styles.optionalPill}>optional</span>
            </label>
            <textarea
              className={styles.reasonTextarea}
              rows={2}
              maxLength={MAX_REASON}
              placeholder={`She actually convinced Chrissy of something. We still don't know how.`}
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
            <div className={styles.charCount}>{reason.length} / {MAX_REASON}</div>
          </div>
        )}

        {status === "error" && <Note variant="magenta">{errorMsg}</Note>}

        {!isMobile && (
          status === "submitting" ? <Spinner /> : (
            <div className={styles.actions}>
              <Button
                variant="primary"
                block
                disabled={!picked || !hasNewPick}
                onClick={() => handleCast(reason)}
              >
                {buttonLabel()}
              </Button>
            </div>
          )
        )}

        {/* Mobile: just show the grid, sheet handles the rest */}
        {isMobile && picked && !sheetOpen && hasNewPick && (
          <div className={styles.actions}>
            <Button variant="primary" block onClick={() => setSheetOpen(true)}>
              {buttonLabel()}
            </Button>
          </div>
        )}
        {isMobile && picked && !hasNewPick && (
          <div className={styles.actions}>
            <Button variant="primary" block disabled>{buttonLabel()}</Button>
          </div>
        )}
      </Card>

      {/* Mobile bottom sheet */}
      {isMobile && sheetOpen && (
        <div className={styles.backdrop} onClick={() => setSheetOpen(false)}>
          <div className={styles.sheet} onClick={e => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <div className={styles.sheetWho}>
              <Avatar name={picked} size={30} />
              <span className={styles.sheetName}>{picked}</span>
            </div>
            <p className={styles.sheetPrompt}>
              Why {picked.split(" ")[0]}?
              <span className={styles.optionalPill}>optional</span>
            </p>
            <textarea
              className={styles.reasonTextarea}
              rows={3}
              maxLength={MAX_REASON}
              placeholder="She actually convinced Chrissy of something. We still don't know how."
              value={reason}
              onChange={e => setReason(e.target.value)}
              autoFocus
            />
            <div className={styles.charCount}>{reason.length} / {MAX_REASON}</div>
            <div className={styles.sheetActions}>
              <Button variant="ghost" onClick={() => handleCast(null)}>
                {status === "submitting" ? "Saving…" : "Skip"}
              </Button>
              <Button variant="primary" onClick={() => handleCast(reason)} disabled={status === "submitting"}>
                {status === "submitting" ? "Saving…" : "Cast vote"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
