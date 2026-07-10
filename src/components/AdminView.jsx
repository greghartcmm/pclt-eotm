import { useState, useEffect, useCallback } from "react"
import { ROSTER, TOKEN_MAP } from "../constants.js"
import { getVotes, clearVotes, getWinnerHistory } from "../supabase.js"
import { Avatar, Card, Button, Note, Spinner } from "./UI.jsx"
import styles from "./AdminView.module.css"

export default function AdminView({ monthKey, monthLabel }) {
  const [votes, setVotes]             = useState(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState("")
  const [resetMsg, setResetMsg]       = useState("")
  const [history, setHistory]         = useState(null)
  const [historyErr, setHistoryErr]   = useState(false)
  const [linksOpen, setLinksOpen]     = useState(false)
  const [copied, setCopied]           = useState("")

  useEffect(() => { loadResults(); loadHistory() }, [])

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

  async function handleReset() {
    if (!confirm(`Clear all votes for ${monthLabel}? This can't be undone.`)) return
    setLoading(true); setError("")
    try { await clearVotes(monthKey); setVotes({}); setResetMsg(`Votes for ${monthLabel} cleared.`) }
    catch (e) { setError(e.message) }
    setLoading(false)
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

  // Tally — votes is now { voterName: { choice, reason } }
  const counts = {}
  const reasonsByChoice = {}
  ROSTER.forEach(n => { counts[n] = 0; reasonsByChoice[n] = [] })
  if (votes) {
    Object.entries(votes).forEach(([, { choice, reason }]) => {
      if (counts.hasOwnProperty(choice)) {
        counts[choice]++
        if (reason) reasonsByChoice[choice].push(reason)
      }
    })
  }
  const entries = Object.entries(counts).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1])
  const totalVotes = votes ? Object.keys(votes).length : 0
  const turnout = Math.round((totalVotes / ROSTER.length) * 100)
  const max = entries[0]?.[1] ?? 0
  const votedSet = new Set(votes ? Object.keys(votes) : [])

  return (
    <div className={styles.layout}>
      <div className={styles.leftCol}>

      {/* ── 1. Live results ── */}
      <Card>
        <div className={styles.resultsHeader}>
          <div>
            <h2 className={styles.h2}>Live results — {monthLabel}</h2>
            <p className={styles.sub}>Only admins can see this until voting closes.</p>
          </div>
          <div className={styles.headerActions}>
            <Button variant="ghost" onClick={loadResults} disabled={loading}>
              {loading ? "Loading…" : "Refresh"}
            </Button>
            <Button variant="danger" onClick={handleReset} disabled={loading}>
              Reset votes
            </Button>
          </div>
        </div>

        {error && <Note variant="magenta">{error}</Note>}
        {resetMsg && <Note variant="cyan">{resetMsg}</Note>}
        {loading && <Spinner />}

        {votes !== null && (
          <>
            <div className={styles.stats}>
              <div className={styles.stat}><div className={styles.statN}>{totalVotes}</div><div className={styles.statL}>Votes cast</div></div>
              <div className={styles.stat}><div className={styles.statN}>{ROSTER.length}</div><div className={styles.statL}>Eligible</div></div>
              <div className={styles.stat}><div className={styles.statN}>{turnout}%</div><div className={styles.statL}>Turnout</div></div>
            </div>

            {entries.length === 0 && (
              <p className={styles.empty}>No votes yet — results will appear as people vote.</p>
            )}

            <div className={styles.candidateList}>
              {entries.map(([name, count]) => {
                const isLead = count === max && max > 0
                const reasons = reasonsByChoice[name]
                return (
                  <div key={name} className={`${styles.candidateRow} ${isLead ? styles.candidateLead : ""}`}>
                    <div className={styles.candidateTop}>
                      <Avatar name={name} size={30} />
                      <span className={styles.candidateName}>
                        {isLead && <span className={styles.crown}>★ </span>}
                        {name}
                      </span>
                      <span className={styles.candidateCount}>{count} {count === 1 ? "vote" : "votes"}</span>
                    </div>
                    {reasons.length > 0 && (
                      <div className={styles.reasonList}>
                        {reasons.map((r, i) => (
                          <div key={i} className={styles.reasonItem}>"{r}"</div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </Card>

      {/* ── 2. Winner history ── */}
      <Card>
        <div className={styles.resultsHeader}>
          <div>
            <h2 className={styles.h2}>Winner history</h2>
            <p className={styles.sub}>Last 12 months, most recent first.</p>
          </div>
          <Button variant="ghost" onClick={loadHistory}>Refresh</Button>
        </div>

        {history === null && !historyErr && <Spinner />}
        {historyErr && <Note variant="magenta">Failed to load history. Try refreshing.</Note>}
        {history !== null && history.length === 0 && (
          <p className={styles.sub}>No history yet — past months will appear here.</p>
        )}
        {history !== null && history.length > 0 && (
          <div className={styles.historyList}>
            {history.map(({ month, label, winners, voteCount, totalVotes }) => (
              <div key={month} className={styles.historyRow}>
                <span className={styles.historyMonth}>{label}</span>
                <span className={styles.historyWinner}>
                  {winners.map((w, i) => (
                    <span key={w}>
                      {i > 0 && <span className={styles.historySep}> & </span>}
                      <strong className={styles.winnerName}>{w}</strong>
                    </span>
                  ))}
                </span>
                <span className={styles.historyMeta}>
                  {voteCount} vote{voteCount === 1 ? "" : "s"}{winners.length > 1 ? " each" : ""} / {totalVotes} total
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      </div>
      <div className={styles.rightCol}>
      {/* ── 3. Voter links (collapsible on mobile) ── */}
      <Card>
        <div className={styles.linksHeader} onClick={() => setLinksOpen(o => !o)}>
          <div>
            <h2 className={styles.h2}>Voter links</h2>
            <p className={styles.sub}>{monthLabel} — send each person their unique link.</p>
          </div>
          <button className={styles.collapseBtn} aria-expanded={linksOpen}>
            <span className={`${styles.chevron} ${linksOpen ? styles.chevronOpen : ""}`}>▾</span>
          </button>
        </div>

        <div className={`${styles.linksBody} ${linksOpen ? styles.linksBodyOpen : ""}`}>
          <Button variant="ghost" onClick={copyAll} className={styles.copyAllBtn}>
            {copied === "__all__" ? "✓ Copied all" : "Copy all links"}
          </Button>
          <div className={styles.tokenList}>
            {ROSTER.map(name => (
              <div key={name} className={styles.tokenRow}>
                <Avatar name={name} size={26} />
                <span className={styles.tokenName}>{name}</span>
                {votes !== null && (
                  <span className={votedSet.has(name) ? styles.votedPill : styles.pendingPill}>
                    {votedSet.has(name) ? "voted" : "pending"}
                  </span>
                )}
                <button className={styles.copyBtn} onClick={() => copyLink(name)}>
                  {copied === name ? "✓" : "Copy"}
                </button>
              </div>
            ))}
          </div>
        </div>
      </Card>

      </div>
    </div>
  )
}
