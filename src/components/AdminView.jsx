import { useState, useEffect, useCallback, useRef } from "react"
import html2canvas from "html2canvas"
import { ROSTER, TOKEN_MAP, colorFor, initials, monthLabelFromKey, nextMonthKey } from "../constants.js"
import {
  getVotes,
  clearVotes,
  getWinnerHistory,
  backupVotes,
  getVoteBackup,
  restoreVotesFromBackup,
  declareWinner,
  getWinner,
  closeVoting,
  openVoting,
} from "../supabase.js"
import { Avatar, Note, Spinner } from "./UI.jsx"
import ConfirmModal from "./ConfirmModal.jsx"
import DeclareWinnerModal from "./DeclareWinnerModal.jsx"
import CelebrationOverlay from "./CelebrationOverlay.jsx"
import WinnerReveal, { COMMENT_DWELL_MS } from "./WinnerReveal.jsx"
import styles from "./AdminView.module.css"
import modalStyles from "./ConfirmModal.module.css"

const GIF_FRAME_SETTLE_MS = 400

function getCloseLabel(monthKey) {
  const [year, mo] = monthKey.split('-').map(Number)
  return new Date(year, mo, 5).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatBackupDetail(backup) {
  const dt = new Date(backup.reset_at)
  const monthDay = dt.toLocaleDateString("en-US", { month: "long", day: "numeric" })
  const time = dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  const n = backup.votes.length
  const firstNames = backup.votes.map(v => v.voter_name.split(" ")[0]).join(", ")
  return `${monthDay} at ${time} · ${n} vote${n === 1 ? "" : "s"}${firstNames ? ` (${firstNames})` : ""}`
}

function formatRestoreBody(backup) {
  const dt = new Date(backup.reset_at)
  const date = dt.toLocaleDateString("en-US", { month: "long", day: "numeric" })
  const time = dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  const n = backup.votes.length
  return `Restore ${n} vote${n === 1 ? "" : "s"} from ${date} at ${time}? This will overwrite any votes cast since the reset.`
}

export default function AdminView({ monthKey, monthLabel, isClosed }) {
  const [votes, setVotes]                     = useState(null)
  const [loading, setLoading]                 = useState(false)
  const [error, setError]                     = useState("")
  const [history, setHistory]                 = useState(null)
  const [historyErr, setHistoryErr]           = useState(false)
  const [copied, setCopied]                   = useState("")
  const [backup, setBackup]                   = useState(null)
  const [winner, setWinner]                   = useState(null)
  const [resetModalOpen, setResetModalOpen]   = useState(false)
  const [resetPin, setResetPin]               = useState("")
  const [resetPinError, setResetPinError]     = useState("")
  const [restoreModalOpen, setRestoreModalOpen] = useState(false)
  const [declareModalOpen, setDeclareModalOpen] = useState(false)
  const [actionLoading, setActionLoading]     = useState(false)
  const [actionError, setActionError]         = useState("")
  const [revealOpen, setRevealOpen]           = useState(false)
  const [openVotingModalOpen, setOpenVotingModalOpen] = useState(false)
  const [gifIndex, setGifIndex]               = useState(null)
  const [gifRecording, setGifRecording]       = useState(false)
  const [gifStatus, setGifStatus]             = useState("")
  const revealCardRef = useRef(null)
  const [celebrationData, setCelebrationData] = useState(null)

  const counts = {}
  const reasonsByChoice = {}
  ROSTER.forEach(n => { counts[n] = 0; reasonsByChoice[n] = [] })
  if (votes) {
    Object.entries(votes).forEach(([, { choice, reason }]) => {
      if (Object.prototype.hasOwnProperty.call(counts, choice)) {
        counts[choice]++
        if (reason) reasonsByChoice[choice].push(reason)
      }
    })
  }
  const entries = Object.entries(counts).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1])
  const totalVotes = votes ? Object.keys(votes).length : 0
  const turnout = ROSTER.length > 0 ? Math.round((totalVotes / ROSTER.length) * 100) : 0
  const max = entries[0]?.[1] ?? 0
  const votedSet = new Set(votes ? Object.keys(votes) : [])
  const closeLabel = getCloseLabel(monthKey)

  useEffect(() => {
    loadResults()
    loadHistory()
    loadBackup()
    loadWinner()
  }, [])

  async function loadResults() {
    setLoading(true); setError("")
    try { setVotes(await getVotes(monthKey)) }
    catch (e) { setError(e.message) }
    setLoading(false)
  }

  const loadHistory = useCallback(async () => {
    setHistoryErr(false); setHistory(null)
    const data = await getWinnerHistory(monthKey)
    if (!data) setHistoryErr(true)
    else setHistory(data)
  }, [])

  async function loadBackup() {
    const data = await getVoteBackup(monthKey)
    setBackup(data)
  }

  async function loadWinner() {
    const data = await getWinner(monthKey)
    setWinner(data)
  }

  async function handleResetWithPin() {
    if (resetPin !== import.meta.env.VITE_ADMIN_PIN) {
      setResetPinError("Incorrect PIN.")
      return
    }
    await handleReset()
  }

  async function handleReset() {
    setActionLoading(true); setActionError("")
    try {
      await backupVotes(monthKey, votes || {})
      await clearVotes(monthKey)
      setVotes({})
      await loadBackup()
      setResetModalOpen(false)
    } catch (e) {
      setActionError(e.message)
    }
    setActionLoading(false)
  }

  async function handleRestore() {
    setActionLoading(true); setActionError("")
    try {
      await restoreVotesFromBackup(monthKey, backup.votes)
      await loadResults()
      setRestoreModalOpen(false)
    } catch (e) {
      setActionError(e.message)
    }
    setActionLoading(false)
  }

  async function handleDeclareWinner(winnerNames, featuredComment) {
    const voteCount = winnerNames.length > 0 ? (counts[winnerNames[0]] || 0) : 0
    const allComments = winnerNames.flatMap(name => reasonsByChoice[name] || [])
    await declareWinner(monthKey, winnerNames, featuredComment, voteCount, totalVotes, allComments)
    await closeVoting(monthKey)
    const w = await getWinner(monthKey)
    setWinner(w)
    setDeclareModalOpen(false)
    setCelebrationData({
      winners: winnerNames,
      featuredComment,
      comments: allComments,
      voteCount,
      totalVotes,
      label: monthLabel,
      month: monthKey,
    })
  }

  async function handleOpenVoting() {
    setActionLoading(true); setActionError("")
    try {
      await openVoting(nextMonthKey(monthKey))
      setOpenVotingModalOpen(false)
    } catch (e) {
      setActionError(e.message)
    }
    setActionLoading(false)
  }

  async function handleRecordGif(comments) {
    if (gifRecording || !revealCardRef.current) return
    setGifRecording(true)
    setGifStatus("Capturing…")
    try {
      const frames = []
      const frameCount = Math.max(comments.length, 1)
      for (let i = 0; i < frameCount; i++) {
        setGifIndex(i)
        await new Promise(r => setTimeout(r, GIF_FRAME_SETTLE_MS))
        const canvas = await html2canvas(revealCardRef.current, {
          scale: 2,
          backgroundColor: "#ffffff",
        })
        frames.push(canvas)
      }

      // GIF's 256-color palette visibly muddies these illustrated portraits —
      // record real video from the same captured frames instead, which has
      // no such color-depth ceiling.
      const mimeType = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"]
        .find(t => window.MediaRecorder?.isTypeSupported(t))
      if (!mimeType) throw new Error("Video recording isn't supported in this browser — try Chrome or Edge.")

      const outCanvas = document.createElement("canvas")
      outCanvas.width = frames[0].width
      outCanvas.height = frames[0].height
      outCanvas.style.position = "fixed"
      outCanvas.style.top = "-99999px"
      document.body.appendChild(outCanvas)
      try {
        const ctx = outCanvas.getContext("2d")
        ctx.drawImage(frames[0], 0, 0)

        const chunks = []
        const recorder = new MediaRecorder(outCanvas.captureStream(10), { mimeType })
        recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
        const recordingTimeoutMs = frames.length * COMMENT_DWELL_MS + 8000
        const stopped = new Promise((resolve, reject) => {
          recorder.onstop = resolve
          recorder.onerror = e => reject(e.error || new Error("MediaRecorder error"))
          setTimeout(() => reject(new Error("Recording timed out — try again with the tab in focus.")), recordingTimeoutMs)
        })
        recorder.start(500)

        for (let i = 0; i < frames.length; i++) {
          ctx.drawImage(frames[i], 0, 0)
          setGifStatus(`Recording video… (${i + 1}/${frames.length})`)
          await new Promise(r => setTimeout(r, COMMENT_DWELL_MS))
        }
        recorder.stop()
        await stopped

        const blob = new Blob(chunks, { type: mimeType })
        const ext = mimeType.includes("mp4") ? "mp4" : "webm"
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `eotm-${monthKey}.${ext}`
        a.click()
        URL.revokeObjectURL(url)
        setGifStatus("Downloaded!")
      } finally {
        outCanvas.remove()
      }
    } catch (e) {
      console.error(e)
      setGifStatus(e.message || "Error — try again")
    } finally {
      setGifIndex(null)
      setGifRecording(false)
      setTimeout(() => setGifStatus(""), 4000)
    }
  }

  function voteLink(name) {
    return `${window.location.origin}${window.location.pathname}?token=${TOKEN_MAP[name]}`
  }
  async function copyLink(name) {
    await navigator.clipboard.writeText(voteLink(name))
    setCopied(name); setTimeout(() => setCopied(""), 1800)
  }
  async function copyAll() {
    const lines = ROSTER.map(n => `${n}: ${voteLink(n)}`).join("\n")
    await navigator.clipboard.writeText(lines)
    setCopied("__all__"); setTimeout(() => setCopied(""), 2000)
  }

  return (
    <>
      <div className={styles.page}>

        {/* Stat banner */}
        <div className={styles.statBanner}>
          <div className={styles.statItem}>
            <div className={`${styles.statNum} ${styles.statAccent}`}>{totalVotes}</div>
            <div className={styles.statLbl}>Votes cast</div>
          </div>
          <div className={styles.statItem}>
            <div className={styles.statNum}>{ROSTER.length}</div>
            <div className={styles.statLbl}>Eligible</div>
          </div>
          <div className={`${styles.statItem} ${styles.statItemLast}`}>
            <div className={`${styles.statNum} ${styles.statAccent}`}>{turnout}%</div>
            <div className={styles.statLbl}>Turnout</div>
          </div>
          <div className={styles.statBarWrap}>
            <div className={styles.statBarTop}>
              <span className={styles.statBarLabel}>{totalVotes} of {ROSTER.length} voted</span>
              <em className={styles.statBarNote}>
                {isClosed ? "Voting closed" : `Voting closes ${closeLabel}`}
              </em>
            </div>
            <div className={styles.barTrack}>
              <div className={styles.barFill} style={{ width: `${turnout}%` }} />
            </div>
          </div>
          <div className={styles.statRefreshWrap}>
            <button className={styles.btnRefresh} onClick={loadResults} disabled={loading}>
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Two-column grid */}
        <div className={styles.cols}>

          {/* Left column */}
          <div className={styles.leftCol}>
            <div className={styles.contentCard}>

              <div className={styles.sectionLabel}>
                <span>Live results — {monthLabel}</span>
                <span className={styles.sectionRight}>Voting closes the 5th</span>
              </div>

              <div className={styles.actionsRow}>
                <button
                  className={styles.btnPrimary}
                  onClick={() => setDeclareModalOpen(true)}
                  disabled={loading}
                >
                  🏆 {winner ? "Edit winner" : "Declare winner"}
                </button>
                {winner && (
                  <button
                    className={styles.btnRefresh}
                    onClick={() => setRevealOpen(true)}
                  >
                    🎉 Show reveal popup
                  </button>
                )}
                {isClosed && (
                  <button
                    className={styles.btnPrimary}
                    onClick={() => setOpenVotingModalOpen(true)}
                  >
                    🔓 Open voting for next month
                  </button>
                )}
              </div>

              {error && <Note variant="magenta">{error}</Note>}
              {loading && <Spinner />}

              {votes !== null && (
                <div className={styles.leaderboard}>
                  {entries.length === 0 && (
                    <p className={styles.empty}>No votes yet — results will appear as people vote.</p>
                  )}
                  {entries.map(([name, count]) => {
                    const isLead = count === max && max > 0
                    const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
                    const reasons = reasonsByChoice[name]
                    return (
                      <div key={name} className={styles.leadRow}>
                        <div className={styles.leadTop}>
                          <Avatar name={name} size={isLead ? 44 : 34} />
                          <div className={styles.leadNameBlock}>
                            <div className={`${styles.leadName} ${isLead ? styles.leadNameLeader : ""}`}>
                              {isLead && <span className={styles.leadStar}>★</span>}
                              {name}
                            </div>
                          </div>
                          <div className={`${styles.voteBadge} ${isLead ? styles.voteBadgeTop : ""}`}>
                            {count} {count === 1 ? "vote" : "votes"}
                          </div>
                        </div>
                        <div className={styles.leadBarWrap}>
                          <div className={styles.leadTrack}>
                            <div
                              className={`${styles.leadFill} ${isLead ? styles.leadFillTop : styles.leadFillRest}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        {reasons.length > 0 && (
                          <div className={styles.leadComments}>
                            {reasons.map((r, i) => (
                              <div key={i} className={styles.leadComment}>"{r}"</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Reset votes — bottom of vote list */}
              <div className={styles.resetRow}>
                <button
                  className={styles.btnReset}
                  onClick={() => setResetModalOpen(true)}
                >
                  Reset votes
                </button>
              </div>

            </div>

            {/* Backup callout — below the card, shown only when backup exists */}
            {backup !== null && (
              <div className={styles.backup}>
                <div className={styles.backupTxt}>
                  <strong>Backup saved</strong> — {formatBackupDetail(backup)}
                </div>
                <button className={styles.btnRestore} onClick={() => setRestoreModalOpen(true)}>
                  Restore
                </button>
              </div>
            )}
          </div>

          {/* Right column — voter links sidebar */}
          <div className={styles.vlSidebar}>
            <div className={styles.vlHeader}>
              <div className={styles.vlTitle}>Voter links</div>
            </div>
            <div className={styles.vlSub}>{monthLabel} · send each person their link</div>

            <button className={styles.btnCopyAll} onClick={copyAll}>
              {copied === "__all__" ? "✓ Copied all" : "Copy all links"}
            </button>

            <div className={styles.voterList}>
              {ROSTER.map(name => (
                <div key={name} className={styles.vrow}>
                  <Avatar name={name} size={26} />
                  <span className={styles.vname}>{name}</span>
                  {votes !== null && votedSet.has(name) && (
                    <span className={styles.votedChip}>✓</span>
                  )}
                  <button className={styles.cpbtn} onClick={() => copyLink(name)}>
                    {copied === name ? "✓" : "Copy"}
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>{/* /cols */}

        {/* Winner history — full width below grid */}
        <div className={styles.historyFull}>
          <div className={styles.contentCard}>
            <div className={styles.sectionLabel}>
              <span>Winner history</span>
              <button className={styles.btnRefresh} onClick={loadHistory}>↻ Refresh</button>
            </div>

            {history === null && !historyErr && <Spinner />}
            {historyErr && <Note variant="magenta">Failed to load history. Try refreshing.</Note>}
            {history !== null && history.length === 0 && (
              <p className={styles.empty}>No history yet — past months will appear here.</p>
            )}
            {history !== null && history.length > 0 && (
              <div>
                {history.map(({ month, label, winners, voteCount, totalVotes: tv, featuredComment }) => (
                  <div
                    key={month}
                    className={styles.histRow}
                    onClick={() => setCelebrationData({
                      winners,
                      featuredComment,
                      voteCount,
                      totalVotes: tv,
                      label,
                      month,
                    })}
                  >
                    <div className={styles.histAv}>
                      <Avatar name={winners[0]} size={38} />
                    </div>
                    <div className={styles.histBody}>
                      <div className={styles.histMonth}>{label}</div>
                      <div className={styles.histName}>{winners.join(" & ")}</div>
                      <div className={styles.histMeta}>
                        {voteCount} vote{voteCount === 1 ? "" : "s"}{winners.length > 1 ? " each" : ""} / {tv} total
                      </div>
                      {featuredComment && (
                        <div className={styles.histComment}>"{featuredComment}"</div>
                      )}
                    </div>
                    <div className={styles.histView}>🏆 View</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>{/* /page */}

      {/* Modals */}
      {resetModalOpen && (
        <ConfirmModal
          title={`Reset votes for ${monthLabel}?`}
          body="A backup will be saved. Enter the admin PIN to confirm."
          confirmLabel="Reset votes"
          variant="danger"
          loading={actionLoading}
          error={resetPinError || actionError}
          onConfirm={handleResetWithPin}
          onCancel={() => {
            setResetModalOpen(false)
            setActionError("")
            setResetPin("")
            setResetPinError("")
          }}
        >
          <input
            className={modalStyles.pinInput}
            type="password"
            inputMode="numeric"
            placeholder="PIN"
            maxLength={8}
            value={resetPin}
            onChange={e => { setResetPin(e.target.value); setResetPinError("") }}
            onKeyDown={e => e.key === "Enter" && handleResetWithPin()}
            autoFocus
          />
        </ConfirmModal>
      )}

      {restoreModalOpen && backup && (
        <ConfirmModal
          title="Restore backup?"
          body={formatRestoreBody(backup)}
          confirmLabel="Restore"
          variant="primary"
          loading={actionLoading}
          error={actionError}
          onConfirm={handleRestore}
          onCancel={() => { setRestoreModalOpen(false); setActionError("") }}
        />
      )}

      {openVotingModalOpen && (
        <ConfirmModal
          title={`Open voting for ${monthLabelFromKey(nextMonthKey(monthKey))}?`}
          body="This advances to the next month and reopens the ballot for everyone immediately."
          confirmLabel="Open voting"
          variant="primary"
          loading={actionLoading}
          error={actionError}
          onConfirm={handleOpenVoting}
          onCancel={() => { setOpenVotingModalOpen(false); setActionError("") }}
        />
      )}

      {declareModalOpen && (
        <DeclareWinnerModal
          monthLabel={monthLabel}
          entries={entries}
          max={max}
          reasonsByChoice={reasonsByChoice}
          currentWinner={winner}
          onSave={handleDeclareWinner}
          onClose={() => setDeclareModalOpen(false)}
        />
      )}

      {celebrationData && (
        <CelebrationOverlay
          data={celebrationData}
          onClose={() => setCelebrationData(null)}
        />
      )}

      {revealOpen && winner && (
        <WinnerReveal
          winner={{ ...winner, label: monthLabel }}
          isPreview={false}
          onDismiss={() => { setRevealOpen(false); setGifIndex(null) }}
          cardRef={revealCardRef}
          controlledIndex={gifIndex}
          onRecordGif={() => handleRecordGif(winner.comments || [])}
          recording={gifRecording}
          recordStatus={gifStatus}
        />
      )}
    </>
  )
}
