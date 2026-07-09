import { useState, useEffect } from "react"
import { ROSTER, previousMonthKey, previousMonthLabel } from "../constants.js"
import { getVotes, clearVotes } from "../supabase.js"
import { Card, Button, Note, Spinner } from "./UI.jsx"
import ResultsView from "./ResultsView.jsx"
import styles from "./AdminView.module.css"

export default function AdminView({ monthKey, monthLabel }) {
  const [tokens, setTokens]     = useState(null)
  const [votes, setVotes]       = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState("")
  const [copied, setCopied]     = useState("")
  const [resetMsg, setResetMsg] = useState("")

  // Pre-generated permanent tokens
  const TOKEN_MAP = {
    "Doug Bedell":      "610b5m6909576i23",
    "Miranda Delatore": "1u692h1t480h1z6h",
    "Nicole Eckl":      "0a2k59070s3a6o0r",
    "Lauren Fields":    "4w360h313p2o3w33",
    "Chrissy Hand":     "3a3t46344z4q226b",
    "Greg Hart":        "59485o351k0o594u",
    "Jen Miesse":       "3k211u6x6h3s2c00",
    "John Priskorn":    "634q1k551s4w665c",
    "Bridget Readey":   "563046285n4p0e6m",
    "Bill Sicheneder":  "3f2u660b0e0h380t",
    "Mike Waldman":     "4h6m4i39282w6l1e",
    "Megan Wetzel":     "5m640x6v6p4t6726",
  }

  useEffect(() => { loadResults() }, [])

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

  function voteLink(name) {
    const token = TOKEN_MAP[name]
    return `${window.location.origin}${window.location.pathname}?token=${token}`
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

  return (
    <div>
      {/* Voter links */}
      <Card>
        <h2 className={styles.h2}>Voter links — {monthLabel}</h2>
        <p className={styles.sub}>
          Send each person their unique link. Links are permanent — reuse every month.
        </p>
        <div className={styles.row}>
          <Button variant="ghost" onClick={copyAll}>
            {copied === "__all__" ? "✓ Copied all links" : "Copy all links"}
          </Button>
        </div>
        <div className={styles.tokenList}>
          {ROSTER.map(name => (
            <div key={name} className={styles.tokenRow}>
              <span className={styles.tokenName}>{name}</span>
              <button className={styles.copyBtn} onClick={() => copyLink(name)}>
                {copied === name ? "✓ Copied" : "Copy link"}
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Live results */}
      <Card>
        <h2 className={styles.h2}>Live results</h2>
        <p className={styles.sub}>Only admins can see this until voting closes.</p>
        <Button variant="ghost" onClick={loadResults} disabled={loading}>
          Refresh results
        </Button>
        {loading && <Spinner />}
        {error && <Note variant="magenta">{error}</Note>}
      </Card>

      {votes !== null && (
        <ResultsView votes={votes} monthLabel={monthLabel} totalEligible={ROSTER.length} />
      )}

      {/* Reset */}
      <Card>
        <h2 className={styles.h2}>Reset voting</h2>
        <p className={styles.sub}>
          Clears all votes for {monthLabel} to start a fresh round.
        </p>
        {resetMsg && <Note variant="cyan">{resetMsg}</Note>}
        {error && <Note variant="magenta">{error}</Note>}
        <Button variant="danger" onClick={handleReset} disabled={loading}>
          Clear votes for {monthLabel}
        </Button>
      </Card>
    </div>
  )
}
