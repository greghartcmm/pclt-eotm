import { useState } from "react"
import { ROSTER, generateToken, previousMonthKey, previousMonthLabel } from "../constants.js"
import {
  fetchVotes,
  writeVotes,
  writeTokens,
  saveGithubConfig,
  clearGithubConfig,
  hasGithubConfig,
} from "../github.js"
import { Card, Button, Note, Spinner } from "./UI.jsx"
import ResultsView from "./ResultsView.jsx"
import styles from "./AdminView.module.css"

export default function AdminView({ adminName }) {
  const [ghOwner, setGhOwner] = useState(localStorage.getItem("pclt-eotm:gh-owner") || "")
  const [ghRepo, setGhRepo] = useState(localStorage.getItem("pclt-eotm:gh-repo") || "")
  const [ghPat, setGhPat] = useState("")
  const [configSaved, setConfigSaved] = useState(hasGithubConfig())
  const [configError, setConfigError] = useState("")

  const [tokens, setTokens] = useState(null) // { name: token }
  const [votes, setVotes] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState("")
  const [resetMsg, setResetMsg] = useState("")

  const monthKey = previousMonthKey()
  const monthLabel = previousMonthLabel()

  // --- GitHub config ---
  function saveConfig() {
    if (!ghOwner || !ghRepo || !ghPat) {
      setConfigError("All three fields are required.")
      return
    }
    saveGithubConfig(ghOwner, ghRepo, ghPat)
    localStorage.setItem("pclt-eotm:gh-owner", ghOwner)
    localStorage.setItem("pclt-eotm:gh-repo", ghRepo)
    setConfigSaved(true)
    setConfigError("")
  }

  function disconnectGithub() {
    clearGithubConfig()
    setConfigSaved(false)
    setGhPat("")
  }

  // --- Token generation ---
  async function generateTokens() {
    setLoading(true)
    setError("")
    try {
      const { data } = await fetchVotes()
      const existing = data["_tokens"] || {}

      // Generate tokens for anyone who doesn't already have one
      const newTokens = { ...existing }
      ROSTER.forEach(name => {
        if (!Object.values(existing).includes(name)) {
          newTokens[generateToken()] = name
        }
      })

      await writeTokens(newTokens)

      // Flip to name→token for display
      const byName = {}
      Object.entries(newTokens).forEach(([tok, name]) => { byName[name] = tok })
      setTokens(byName)
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  // --- Load results ---
  async function loadResults() {
    setLoading(true)
    setError("")
    try {
      const { data } = await fetchVotes()
      setVotes(data[monthKey] || {})
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  // --- Reset votes ---
  async function resetVotes() {
    if (!confirm(`Clear all votes for ${monthLabel}? The tokens will remain. This can't be undone.`)) return
    setLoading(true)
    setError("")
    try {
      const { data, sha } = await fetchVotes()
      delete data[monthKey]
      await writeVotes(data, sha, `Reset votes for ${monthKey}`)
      setVotes({})
      setResetMsg("Votes cleared.")
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  // --- Copy link ---
  function voteLink(token) {
    return `${window.location.origin}${window.location.pathname}?token=${token}`
  }

  async function copyLink(name, token) {
    await navigator.clipboard.writeText(voteLink(token))
    setCopied(name)
    setTimeout(() => setCopied(""), 1800)
  }

  async function copyAll() {
    if (!tokens) return
    const lines = ROSTER.map(name =>
      `${name}: ${voteLink(tokens[name])}`
    ).join("\n")
    await navigator.clipboard.writeText(lines)
    setCopied("__all__")
    setTimeout(() => setCopied(""), 2000)
  }

  return (
    <div>
      {/* GitHub config */}
      <Card>
        <h2 className={styles.h2}>GitHub connection</h2>
        <p className={styles.sub}>
          Your PAT stays on this device only — it's never sent anywhere except GitHub's API.
        </p>

        {configSaved ? (
          <div className={styles.connected}>
            <span className={styles.connectedDot} />
            Connected to <strong>{ghOwner}/{ghRepo}</strong>
            <Button variant="ghost" onClick={disconnectGithub} className={styles.disconnectBtn}>
              Disconnect
            </Button>
          </div>
        ) : (
          <>
            <label className={styles.lbl}>GitHub owner (username or org)</label>
            <input className={styles.input} value={ghOwner} onChange={e => setGhOwner(e.target.value)} placeholder="e.g. mckesson" />
            <label className={styles.lbl}>Repository name</label>
            <input className={styles.input} value={ghRepo} onChange={e => setGhRepo(e.target.value)} placeholder="e.g. pclt-eotm" />
            <label className={styles.lbl}>Personal Access Token (contents: write)</label>
            <input className={styles.input} type="password" value={ghPat} onChange={e => setGhPat(e.target.value)} placeholder="ghp_…" />
            {configError && <Note variant="magenta">{configError}</Note>}
            <div className={styles.row} style={{ marginTop: 14 }}>
              <Button variant="primary" onClick={saveConfig}>Save connection</Button>
            </div>
          </>
        )}
      </Card>

      {/* Token generation */}
      <Card>
        <h2 className={styles.h2}>Voter links — {monthLabel}</h2>
        <p className={styles.sub}>
          Generate a unique voting link for each PCLT member. Share via email or Teams.
          Each link identifies the voter — they don't need to type anything.
        </p>

        {!configSaved && (
          <Note variant="orange">Connect to GitHub above before generating tokens.</Note>
        )}

        {configSaved && (
          <div className={styles.row}>
            <Button variant="primary" onClick={generateTokens} disabled={loading}>
              {tokens ? "Regenerate links" : "Generate voter links"}
            </Button>
            {tokens && (
              <Button variant="ghost" onClick={copyAll}>
                {copied === "__all__" ? "✓ Copied all" : "Copy all links"}
              </Button>
            )}
          </div>
        )}

        {loading && <Spinner />}
        {error && <Note variant="magenta">{error}</Note>}

        {tokens && (
          <div className={styles.tokenList}>
            {ROSTER.map(name => (
              <div key={name} className={styles.tokenRow}>
                <span className={styles.tokenName}>{name}</span>
                <code className={styles.tokenCode}>{voteLink(tokens[name]).slice(-20)}…</code>
                <button
                  className={styles.copyBtn}
                  onClick={() => copyLink(name, tokens[name])}
                >
                  {copied === name ? "✓ Copied" : "Copy link"}
                </button>
              </div>
            ))}
          </div>
        )}

        <Note variant="orange">
          Each link is single-use per month. If someone loses theirs, generate a new set — existing votes are preserved.
        </Note>
      </Card>

      {/* Live results */}
      <Card>
        <h2 className={styles.h2}>Results</h2>
        <p className={styles.sub}>Only you and the other admins can see this until voting closes.</p>
        <Button variant="ghost" onClick={loadResults} disabled={loading}>
          {votes !== null ? "Refresh results" : "Load results"}
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
          Clears all recorded votes for {monthLabel}. The roster and tokens stay intact.
          Use this only to start the round over.
        </p>
        {resetMsg && <Note variant="cyan">{resetMsg}</Note>}
        <Button variant="danger" onClick={resetVotes} disabled={loading}>
          Clear votes for {monthLabel}
        </Button>
      </Card>
    </div>
  )
}
