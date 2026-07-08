import { useState, useEffect } from "react"
import { ROSTER, previousMonthLabel, previousMonthKey } from "./constants.js"
import { fetchVotes } from "./github.js"
import { FrameBar, Card, Note, Spinner } from "./components/UI.jsx"
import VotingView from "./components/VotingView.jsx"
import AdminView from "./components/AdminView.jsx"
import PinGate from "./components/PinGate.jsx"
import styles from "./App.module.css"

export default function App() {
  const [appState, setAppState] = useState("loading")
  // loading | voter | invalid-token | no-token | error | admin-pin | admin
  const [voterName, setVoterName] = useState(null)
  const [existingVote, setExistingVote] = useState(null)
  const [isAdminRoute, setIsAdminRoute] = useState(false)
  const [activeTab, setActiveTab] = useState("admin") // "admin" | "vote"

  const monthKey   = previousMonthKey()
  const monthLabel = previousMonthLabel()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token  = params.get("token")
    const admin  = params.get("admin")

    if (admin === "true") {
      setIsAdminRoute(true)
      setAppState("admin-pin")
      return
    }

    if (!token) {
      setAppState("no-token")
      return
    }

    initVoter(token)
  }, [])

  async function initVoter(token) {
    try {
      const { data } = await fetchVotes()
      const tokenMap = data["_tokens"] || {}
      const resolvedName = tokenMap[token]

      if (!resolvedName || !ROSTER.includes(resolvedName)) {
        setAppState("invalid-token")
        return
      }

      setVoterName(resolvedName)
      const monthVotes = data[monthKey] || {}
      if (monthVotes[resolvedName]) setExistingVote(monthVotes[resolvedName])
      setAppState("voter")
    } catch (e) {
      console.error(e)
      setAppState("error")
    }
  }

  // ── Admin route ──────────────────────────────────────────────────────────
  if (isAdminRoute) {
    const adminUrl = `${window.location.origin}${window.location.pathname}?admin=true`
    const voteUrl  = `${window.location.origin}${window.location.pathname}`

    return (
      <div className={styles.root}>
        <FrameBar />
        <div className={styles.wrap}>
          <Header monthLabel={monthLabel} />

          {appState === "admin-pin" && (
            <PinGate onUnlock={() => setAppState("admin")} />
          )}

          {appState === "admin" && (
            <>
              <div className={styles.tabBar}>
                <button
                  className={`${styles.tab} ${activeTab === "admin" ? styles.tabActive : ""}`}
                  onClick={() => setActiveTab("admin")}
                >
                  Admin panel
                </button>
                <button
                  className={`${styles.tab} ${activeTab === "vote" ? styles.tabActive : ""}`}
                  onClick={() => setActiveTab("vote")}
                >
                  Voting page
                </button>
              </div>

              {activeTab === "admin" && <AdminView />}

              {activeTab === "vote" && (
                <Card>
                  <h2 className={styles.setupH2}>Voting page preview</h2>
                  <p className={styles.setupSub}>
                    The voting page is accessed via personalized links. Copy a voter link
                    from the Admin panel to preview it, or share the admin URL below with
                    the other admins.
                  </p>
                  <div className={styles.urlBlock}>
                    <span className={styles.urlLabel}>Admin URL</span>
                    <code className={styles.urlCode}>{adminUrl}</code>
                  </div>
                  <div className={styles.urlBlock} style={{ marginTop: 10 }}>
                    <span className={styles.urlLabel}>Base app URL</span>
                    <code className={styles.urlCode}>{voteUrl}</code>
                  </div>
                </Card>
              )}
            </>
          )}

          <footer className={styles.footer}>CoverMyMeds is a McKesson company.</footer>
        </div>
      </div>
    )
  }

  // ── Voter route ───────────────────────────────────────────────────────────
  return (
    <div className={styles.root}>
      <FrameBar />
      <div className={styles.wrap}>
        <Header monthLabel={monthLabel} />
        <main>
          {appState === "loading" && <Card><Spinner /></Card>}

          {appState === "no-token" && (
            <Card>
              <h2 className={styles.setupH2}>No voting link detected</h2>
              <p className={styles.setupSub}>
                To vote, use the personalized link sent to you by your PCLT admin.
                Links look like: <code className={styles.code}>…?token=abc123</code>
              </p>
            </Card>
          )}

          {appState === "invalid-token" && (
            <Card>
              <h2 className={styles.setupH2}>Link not recognized</h2>
              <p className={styles.setupSub}>
                This voting link isn't valid for {monthLabel}. Check that you used
                the most recent link from your admin, or ask them to resend it.
              </p>
            </Card>
          )}

          {appState === "error" && (
            <Card>
              <Note variant="magenta">
                Something went wrong loading the app. Please try again or contact your admin.
              </Note>
            </Card>
          )}

          {appState === "voter" && (
            <VotingView
              voterName={voterName}
              monthKey={monthKey}
              monthLabel={monthLabel}
              existingVote={existingVote}
              onVoteCast={(choice) => setExistingVote(choice)}
            />
          )}
        </main>
        <footer className={styles.footer}>CoverMyMeds is a McKesson company.</footer>
      </div>
    </div>
  )
}

function Header({ monthLabel }) {
  return (
    <header className={styles.mast}>
      <div className={styles.eyebrow}>
        CoverMyMeds <span className={styles.dot}>•</span> PCLT Team
      </div>
      <h1 className={styles.h1}>Employee of the Month</h1>
      <div className={styles.period}>
        Recognizing our teammate for <strong>{monthLabel}</strong>
      </div>
    </header>
  )
}
