import { useState, useRef, useEffect } from "react"
import { ROSTER } from "../constants.js"
import { castVote } from "../supabase.js"
import { Avatar, Card, Button, Note, Spinner } from "./UI.jsx"
import styles from "./VotingView.module.css"

const VO_COLORS = ['#FF8F1C','#E70865','#01426A','#008AD8','#00B37E','#9B59B6']
const VO_DIRS   = [[-36,-52],[-16,-62],[0,-65],[16,-62],[36,-52],[-54,-28],[-60,-6],[-54,16],[54,-28],[60,-6],[54,16],[-28,38],[0,48],[28,38]]
const MAX_REASON = 80

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 680)
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 680)
    window.addEventListener("resize", fn)
    return () => window.removeEventListener("resize", fn)
  }, [])
  return mobile
}

export default function VotingView({ voterName, monthKey, monthLabel, existingVote, isClosed, onVoteCast }) {
  const [picked, setPicked]           = useState(existingVote || null)
  const [confirmedVote, setConfirmed] = useState(existingVote || null)
  const [reason, setReason]           = useState("")
  const [sheetOpen, setSheetOpen]     = useState(false)
  const [status, setStatus]           = useState("idle")
  const [errorMsg, setErrorMsg]       = useState("")
  const [overlayVisible, setOverlayVisible] = useState(false)
  const dismissTimer = useRef(null)
  const isMobile = useIsMobile()

  const candidates = ROSTER.filter(n => n !== voterName)
  const isChanging = !!confirmedVote
  const hasNewPick = picked !== confirmedVote

  // ── Voting closed ────────────────────────────────────────────────────────
  if (isClosed) {
    return (
      <Card>
        <div className={styles.closedIcon}>🔒</div>
        <h2 className={styles.h2}>Voting is closed</h2>
        <p className={styles.sub}>
          Voting for <strong>{monthLabel}</strong> is now closed. Check back next month!
        </p>
      </Card>
    )
  }

  async function handleCast(reasonArg) {
    if (!picked || status === "submitting") return
    setStatus("submitting")
    setErrorMsg("")
    setSheetOpen(false)

    const result = await castVote(monthKey, voterName, picked, reasonArg || null)

    if (result.success) {
      const choice = picked
      setConfirmed(choice)
      setStatus("idle")
      onVoteCast(choice)
      showOverlay(choice)
    } else {
      setStatus("error")
      setErrorMsg(result.error || "Something went wrong. Please try again.")
    }
  }

  function showOverlay(choice) {
    setOverlayVisible(true)
    requestAnimationFrame(() => {
      const ballot  = document.getElementById("vo-ballot")
      const boxWrap = document.getElementById("vo-box-wrap")
      const conf    = document.getElementById("vo-conf")
      const fill    = document.getElementById("vo-fill")
      if (!ballot || !boxWrap || !conf || !fill) return

      ballot.style.animation  = "none"
      boxWrap.style.animation = "none"
      conf.innerHTML = ""
      void ballot.offsetWidth

      ballot.style.animation  = "voDrop .6s cubic-bezier(.4,0,.2,1) .2s forwards"
      boxWrap.style.animation = "voWiggle .35s ease .95s"

      VO_DIRS.forEach(([dx, dy], i) => {
        const d = document.createElement("div")
        d.className = styles.voDot
        d.style.cssText = `left:calc(50% - 3px);top:50%;background:${VO_COLORS[i % VO_COLORS.length]};--vo-tx:translate(${dx}px,${dy}px);animation:voPop .6s ease ${1.0 + i * .02}s forwards`
        conf.appendChild(d)
      })

      fill.style.transition = "none"
      fill.style.width = "100%"
      void fill.offsetWidth
      fill.style.transition = "width 2.2s linear .4s"
      fill.style.width = "0%"
    })

    if (dismissTimer.current) clearTimeout(dismissTimer.current)
    dismissTimer.current = setTimeout(() => setOverlayVisible(false), 2600)
  }

  function buttonLabel() {
    if (status === "submitting") return "Saving…"
    if (!picked)       return "Select someone to vote"
    if (!isChanging)   return `Cast vote for ${picked}`
    if (!hasNewPick)   return `Your vote: ${picked}`
    return `Change vote to ${picked}`
  }

  return (
    <>
      <Card className={styles.voteCard}>
        <div className={styles.voterBadge}>
          <Avatar name={voterName} size={34} />
          <span className={styles.voterName}>Voting as <strong>{voterName}</strong></span>
        </div>

        <h2 className={styles.h2}>{isChanging ? "Change your vote" : "Cast your vote"}</h2>
        <p className={styles.sub}>
          {isChanging
            ? `You voted for ${confirmedVote}. Select someone below to change your vote.`
            : "Pick one teammate. You can't vote for yourself."}
        </p>

        <div className={styles.grid}>
          {candidates.map(name => (
            <button
              key={name}
              className={`${styles.pick} ${picked === name ? styles.pickSelected : ""}`}
              aria-pressed={picked === name}
              onClick={() => { setPicked(name); setReason("") }}
              disabled={status === "submitting"}
            >
              <Avatar name={name} size={38} />
              <span className={styles.nm}>{name}</span>
              <span className={styles.chk} aria-hidden>✓</span>
            </button>
          ))}
        </div>

        {/* Desktop: inline reason field appears after picking */}
        {!isMobile && picked && hasNewPick && (
          <div className={styles.reasonSection}>
            <div className={styles.reasonLabel}>
              Why {picked.split(" ")[0]}?
              <span className={styles.optionalPill}>optional</span>
            </div>
            <textarea
              className={styles.reasonTextarea}
              rows={3}
              maxLength={MAX_REASON}
              placeholder="She actually convinced Chrissy of something. We still don't know how."
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
            <div className={styles.charCount}>{reason.length} / {MAX_REASON}</div>
          </div>
        )}

        {status === "error" && <Note variant="magenta">{errorMsg}</Note>}

        {/* Desktop cast button */}
        {!isMobile && (
          status === "submitting" ? <Spinner /> : (
            <div className={styles.actions}>
              <Button
                variant="primary"
                block
                disabled={!picked || (isChanging && !hasNewPick)}
                onClick={() => handleCast(reason)}
              >
                {buttonLabel()}
              </Button>
            </div>
          )
        )}

        {/* Mobile: button opens sheet; if no change, disabled */}
        {isMobile && picked && hasNewPick && !sheetOpen && (
          <div className={styles.actions}>
            <Button variant="primary" block onClick={() => setSheetOpen(true)}>
              {buttonLabel()}
            </Button>
          </div>
        )}
        {isMobile && (!picked || (isChanging && !hasNewPick)) && (
          <div className={styles.actions}>
            <Button variant="primary" block disabled>{buttonLabel()}</Button>
          </div>
        )}

        {/* Ballot drop overlay */}
        {overlayVisible && (
          <div className={styles.voteOverlay}>
            <div className={styles.voAnim}>
              <div className={styles.voBallot} id="vo-ballot">
                <div className={styles.voBl} />
                <div className={styles.voBl} />
                <div className={`${styles.voBl} ${styles.voBlAccent}`} />
              </div>
              <div className={styles.voConf} id="vo-conf" />
              <div className={styles.voBoxWrap} id="vo-box-wrap">
                <div className={styles.voSlot} />
                <div className={styles.voBox}>&#128506;</div>
              </div>
            </div>
            <div className={styles.voTitle}>Vote recorded</div>
            <div className={styles.voSub}>
              Thanks, {voterName.split(" ")[0]}. Your vote for <strong>{confirmedVote}</strong> is in.
            </div>
            <div className={styles.voProgress}>
              <div className={styles.voProgressFill} id="vo-fill" />
            </div>
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
              <Button variant="ghost" onClick={() => handleCast(null)} disabled={status === "submitting"}>
                {status === "submitting" ? "Saving…" : "Skip"}
              </Button>
              <Button variant="primary" onClick={() => handleCast(reason)} disabled={status === "submitting"}>
                {status === "submitting" ? "Saving…" : `Vote for ${picked.split(" ")[0]}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
