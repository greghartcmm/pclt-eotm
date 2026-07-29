import { useState, useEffect, useRef } from "react"
import { ROSTER, getVotingPeriod, ADMIN_TOKENS } from "./constants.js"
import { resolveToken, getExistingVote } from "./supabase.js"
import { FrameBar, Card, Note, Spinner, Button } from "./components/UI.jsx"
import VotingView from "./components/VotingView.jsx"
import AdminView from "./components/AdminView.jsx"
import PinGate from "./components/PinGate.jsx"
import SplashScreen from "./components/SplashScreen.jsx"
import styles from "./App.module.css"

export default function App() {
  const [appState, setAppState] = useState("loading")
  const [voterName, setVoterName] = useState(null)
  const [existingVote, setExistingVote] = useState(null)
  const [isAdminRoute, setIsAdminRoute] = useState(false)
  const [activeTab, setActiveTab] = useState("admin")

  const [showSplash, setShowSplash] = useState(() =>
    !!new URLSearchParams(window.location.search).get("token")
  )
  const [mainVisible, setMainVisible] = useState(() =>
    !new URLSearchParams(window.location.search).get("token")
  )

  const headerRef = useRef(null)
  const { monthKey, monthLabel, isClosed } = getVotingPeriod()

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
      const name = await resolveToken(token)

      if (!name || !ROSTER.includes(name)) {
        setAppState("invalid-token")
        return
      }

      setVoterName(name)

      if (!isClosed) {
        const existing = await getExistingVote(monthKey, name)
        if (existing) setExistingVote(existing)
      }

      setAppState("voter")
    } catch (e) {
      console.error(e)
      setAppState("error")
    }
  }

  // ── Admin route ──────────────────────────────────────────────────────────
  if (isAdminRoute) {
    return (
      <div className={styles.root}>
        <FrameBar />
        <div className={styles.wrapAdmin}>
          <AdminHeader monthLabel={monthLabel} />

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

              {activeTab === "admin" && <AdminView monthKey={monthKey} monthLabel={monthLabel} />}

              {activeTab === "vote" && <AdminVotingLinks />}
            </>
          )}

          <footer className={styles.footer}>CoverMyMeds is a McKesson company.</footer>
        </div>
      </div>
    )
  }

  // ── Voter route ───────────────────────────────────────────────────────────
  return (
    <div className={styles.voterRoot}>
      {showSplash && (
        <SplashScreen
          monthLabel={monthLabel}
          headerRef={headerRef}
          onRevealPage={() => setMainVisible(true)}
          onDone={() => setShowSplash(false)}
        />
      )}

      <FrameBar />

      <header className={styles.headerStrip} ref={headerRef}>
        <div className={styles.headerInner}>
          <p className={styles.headerEyebrow}>CoverMyMeds · PCLT Team</p>
          <h1 className={styles.headerH1}>
            Employee of the<br /><span className={styles.headerH1Amber}>Month</span>
          </h1>
          <p className={styles.headerMonthLine}>
            <span className={styles.headerMonthValue}>{monthLabel}</span>
          </p>
          <p className={styles.headerDesc}>
            Who picked up the tab, talked the team into a terrible idea, or did something vaguely worthy of this unserious but coveted award?
          </p>
          <p className={styles.headerDeadline}>
            Votes must be in by EOD on the 5th.
          </p>
        </div>
      </header>

      <div className={`${styles.mainPage} ${mainVisible ? styles.mainVisible : ""}`}>
        <div className={styles.wrap}>
          <main>
            {appState === "loading" && <Card><Spinner /></Card>}

            {appState === "no-token" && (
              <Card>
                <h2 className={styles.setupH2}>No voting link detected</h2>
                <p className={styles.setupSub}>
                  To vote, use the personalized link sent to you by your PCLT admin.
                </p>
              </Card>
            )}

            {appState === "invalid-token" && (
              <Card>
                <h2 className={styles.setupH2}>Link not recognized</h2>
                <p className={styles.setupSub}>
                  This voting link isn't valid for {monthLabel}. Ask your admin to resend it.
                </p>
              </Card>
            )}

            {appState === "error" && (
              <Card>
                <Note variant="magenta">
                  Something went wrong. Please try again or contact your admin.
                </Note>
              </Card>
            )}

            {appState === "voter" && (
              <VotingView
                voterName={voterName}
                monthKey={monthKey}
                monthLabel={monthLabel}
                existingVote={existingVote}
                isClosed={isClosed}
                onVoteCast={(choice) => setExistingVote(choice)}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

// Admin route keeps the original header style
function AdminHeader({ monthLabel }) {
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

function AdminVotingLinks() {
  const base = `${window.location.origin}${window.location.pathname}`

  return (
    <Card>
      <h2 className={styles.setupH2}>Admin voting links</h2>
      <p className={styles.setupSub}>
        Click your link below to open your personal ballot. Other team members use their own
        personalized links sent by email.
      </p>
      <div className={styles.adminLinkList}>
        {Object.entries(ADMIN_TOKENS).map(([name, tok]) => (
          <Button
            key={name}
            variant="ghost"
            onClick={() => { window.location.href = `${base}?token=${tok}` }}
          >
            {name}
          </Button>
        ))}
      </div>
    </Card>
  )
}
