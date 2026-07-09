import { useState, useEffect, useCallback } from "react"
import { ROSTER, TOKEN_MAP } from "../constants.js"
import { getVotes, clearVotes, getWinnerHistory } from "../supabase.js"
import { Card, Button, Note, Spinner } from "./UI.jsx"
import ResultsView from "./ResultsView.jsx"
import styles from "./AdminView.module.css"

export default function AdminView({ monthKey, monthLabel }) {
  const [votes, setVotes]         = useState(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState("")
  const [copied, setCopied]       = useState("")
  const [resetMsg, setResetMsg]   = useState("")
  const [history, setHistory]     = useState(null)  // null = loading
  const [historyErr, setHistoryErr] = useState(false)

  useEffect(() => {
    loadResults()
    loadHistory()
  }, [])

  async function loadResults() {
    setLoading(true)
    setError("")
    try {
      const data = await getVotes(monthKey)
      setVotes(data)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const loadHistory = useCallback(async () => {
    setHistoryErr(false)
    setHistory(null)
    const data = await getWinnerHistory()
    if (!data) setHistoryErr(true)
    else setHistory(data)
  }, [])

  function voteLink(name) {
    return `${window.location.origin}${window.location.pathname}?token=${TOKEN_MAP[name]}`
  }

  async function copyLink(name) {
    await navigator.clipboard.writeText(voteLink(name))
    setCopied(name)
    setTimeout(() => setCopied(""), 1800)
  }

  async function copyAll() {
    const lines = ROSTER.map(name => `${name}: ${voteLink(name)}`).join("\n")
    await navigator.clipboard.writeText(lines)
    setCopied("__all__")
    setTimeout(() => setCopied(""), 2000)
  }

  async function handleReset() {
    if (!confirm(`Clear all votes for ${monthLabel}? This can't be undone.`)) return
    setLoading(true)
    setError("")
    try {
      await clearVotes(monthKey)
      setVotes({})
      setResetMsg(`Votes for ${monthLabel} cleared.`)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  // Determine who has voted this month
  const votedSet = new Set(votes ? Object.keys(votes) : [])

  return (
    <div className={styles.layout}>

      {/* LEFT — Voter links */}
      <Card className={styles.linksCard}>
        <h2 className={styles.h2}>Voter links</h2>
        <p className={styles.sub}>{monthLabel} — send each person their unique link.</p>
        <Button variant="ghost" onClick={copyAll} className={styles.copyAllBtn}>
          {copied === "__all__" ? "✓ Copied all" : "Copy all links"}
        </Button>
        <div className={styles.tokenList}>
          {ROSTER.map(name => (
            <div key={name} className={styles.tokenRow}>
              <span className={styles.tokenName}>{name}</span>
              {votes !== null && (
                <span className={votedSet.has(name) ? styles.votedPill : styles.pendingPill}>
                  {votedSet.has(name) ? "voted" : "pending"}
                </span>
              )}
              <button className={styles.copyBtn} onClick={() => copyLink(name)}>
                {copied === name ? "✓ Copied" : "Copy"}
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* RIGHT — Results + History */}
      <div className={styles.rightCol}>

        {/* Live results */}
        <Card className={styles.resultsCard}>
          <div className={styles.resultsHeader}>
            <div>
              <h2 className={styles.h2}>Live results</h2>
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
            <ResultsView
              votes={votes}
              monthLabel={monthLabel}
              totalEligible={ROSTER.length}
              bare
            />
          )}
        </Card>

        {/* Winner history */}
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
    </div>
  )
}
