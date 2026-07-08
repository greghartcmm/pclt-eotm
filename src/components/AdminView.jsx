import { useState, useEffect } from "react"
import { ROSTER, previousMonthKey, previousMonthLabel } from "../constants.js"
import { fetchVotes, writeVotes, saveGithubConfig, clearGithubConfig, hasGithubConfig } from "../github.js"
import { Card, Button, Note, Spinner } from "./UI.jsx"
import ResultsView from "./ResultsView.jsx"
import styles from "./AdminView.module.css"

const GH_OWNER = "greghartcmm"
const GH_REPO  = "pclt-eotm"

export default function AdminView() {
  const [tokens, setTokens] = useState(null)   // { name: token }
  const [votes, setVotes]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState("")
  const [copied, setCopied] = useState("")
  const [resetMsg, setResetMsg] = useState("")

  // PAT for write operations (reset) — Greg only
  const [ghPat, setGhPat]       = useState("")
  const [configSaved, setConfigSaved] = useState(hasGithubConfig())
  const [configError, setConfigError] = useState("")
  const [showPatPanel, setShowPatPanel] = useState(false)

  const monthKey   = previousMonthKey()
  const monthLabel = previousMonthLabel()

  // Load tokens + results on mount
  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    setError("")
    try {
      const { data } = await fetchVotes(GH_OWNER, GH_REPO)
      // Build name → token map
      const byName = {}
      Object.entries(data["_tokens"] || {}).forEach(([tok, name]) => { byName[name] = tok })
      setTokens(byName)
      setVotes(data[monthKey] || {})
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  function voteLink(token) {
    return `${window.location.origin}${window.location.pathname}?token=${token}`
  }

  async function copyLink(name) {
    await navigator.clipboard.writeText(voteLink(tokens[name]))
    setCopied(name)
    setTimeout(() => setCopied(""), 1800)
  }

  async function copyAll() {
    const lines = ROSTER.map(name => `${name}: ${voteLink(tokens[name])}`).join("\n")
    await navigator.clipboard.writeText(lines)
    setCopied("__all__")
    setTimeout(() => setCopied(""), 2000)
  }

  // --- PAT config (write operations) ---
  function saveConfig() {
    if (!ghPat) { setConfigError("PAT is required."); return }
    saveGithubConfig(GH_OWNER, GH_REPO, ghPat)
    setConfigSaved(true)
    setConfigError("")
    setShowPatPanel(false)
  }

  // --- Reset votes ---
  async function resetVotes() {
    if (!configSaved) { setShowPatPanel(true); return }
    if (!confirm(`Clear all votes for ${monthLabel}? This can't be undone.`)) return
    setLoading(true)
    setError("")
    try {
      const { data, sha } = await fetchVotes(GH_OWNER, GH_REPO)
      delete data[monthKey]
      await writeVotes(data, sha, `Reset votes for ${monthKey}`)
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
          Send each person their unique link. Links are permanent — reuse them every month.
        </p>

        {loading && <Spinner />}
        {error && <Note variant="magenta">{error}</Note>}

        {tokens && (
          <>
            <div className={styles.row}>
              <Button variant="ghost" onClick={copyAll}>
                {copied === "__all__" ? "✓ Copied all links" : "Copy all links"}
              </Button>
              <Button variant="ghost" onClick={loadData}>Refresh</Button>
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
          </>
        )}
      </Card>

      {/* Live results */}
      {votes !== null && (
        <ResultsView votes={votes} monthLabel={monthLabel} totalEligible={ROSTER.length} />
      )}

      {/* Reset — Greg only, requires PAT */}
      <Card>
        <h2 className={styles.h2}>Reset voting</h2>
        <p className={styles.sub}>
          Clears all votes for {monthLabel} to start a new round. Requires a GitHub PAT with write access.
        </p>

        {showPatPanel && (
          <>
            <label className={styles.lbl}>Personal Access Token (contents: write)</label>
            <input
              className={styles.input}
              type="password"
              value={ghPat}
              onChange={e => setGhPat(e.target.value)}
              placeholder="ghp_…"
            />
            {configError && <Note variant="magenta">{configError}</Note>}
            <div className={styles.row} style={{ marginTop: 12 }}>
              <Button variant="primary" onClick={saveConfig}>Save &amp; continue</Button>
              <Button variant="ghost" onClick={() => setShowPatPanel(false)}>Cancel</Button>
            </div>
          </>
        )}

        {resetMsg && <Note variant="cyan">{resetMsg}</Note>}

        {!showPatPanel && (
          <div className={styles.row}>
            <Button variant="danger" onClick={resetVotes} disabled={loading}>
              Clear votes for {monthLabel}
            </Button>
            {configSaved && (
              <Button variant="ghost" onClick={() => { clearGithubConfig(); setConfigSaved(false) }}>
                Disconnect PAT
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
