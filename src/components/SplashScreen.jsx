import { useState, useEffect, useRef } from "react"
import styles from "./SplashScreen.module.css"

const QUOTES = [
  { text: "They say your vote matters.\nStatistically, it probably does not.", attr: "Department of Realistic Expectations" },
  { text: "Hard work pays off.\nIn this case, with a trophy emoji and mild applause.", attr: "Compensation & Benefits" },
  { text: "A rising tide lifts all boats.\nThis lifts one employee, briefly.", attr: "Maritime Affairs Division" },
  { text: "You miss 100% of the votes you don't cast—\nand save nearly 40 seconds.", attr: "Productivity Optimization Team" },
  { text: "The secret to success is showing up.\nThe secret to this is clicking a name.", attr: "Leadership Development" },
  { text: "Choose wisely. Or choose quickly.\nThe system records both the same way.", attr: "Voting Operations" },
  { text: "Behind every great employee is a team\nwondering why they weren't nominated.", attr: "Organizational Effectiveness" },
  { text: "History remembers the bold.\nThis page remembers whoever gets the most clicks.", attr: "Records Management" },
  { text: "Please recognize responsibly.", attr: "Employee Wellness" },
  { text: "Today's nominee could be tomorrow's person\nwho forgets to mute.", attr: "Workplace Technology" },
  { text: "Some heroes wear capes.\nOthers reply-all with the correct attachment.", attr: "Enterprise Productivity Council" },
  { text: "Vote for the colleague who made work better—\nor at least made the meeting shorter.", attr: "Operational Excellence" },
  { text: "Recognition builds culture.\nThis builds a Teams post and briefly interrupts the workday.", attr: "Internal Communications" },
  { text: "Together, we achieve great things.\nToday, we are clicking on one of them.", attr: "Strategic Alignment Office" },
]

const DURATION      = 2800  // total before dismiss
const QUOTE_HOLD    = 1300  // how long each quote is visible
const QUOTE_FADE    = 200   // half of the crossfade window

export default function SplashScreen({ monthLabel, headerRef, onRevealPage, onDone }) {
  const [quotes] = useState(() => {
    const shuffled = [...QUOTES].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, 2)
  })
  const [quoteIndex, setQuoteIndex]   = useState(0)
  const [quoteVisible, setQuoteVisible] = useState(true)
  const [bodyVisible, setBodyVisible]   = useState(true)
  const [splashHeight, setSplashHeight] = useState("100vh")
  const [shellVisible, setShellVisible] = useState(true)
  const [gone, setGone]                 = useState(false)
  const dismissedRef = useRef(false)
  const timerRef     = useRef(null)

  useEffect(() => {
    // Crossfade to second quote at QUOTE_HOLD
    const t1 = setTimeout(() => {
      setQuoteVisible(false)
      setTimeout(() => {
        setQuoteIndex(1)
        setQuoteVisible(true)
      }, QUOTE_FADE)
    }, QUOTE_HOLD)

    timerRef.current = setTimeout(() => dismiss(), DURATION)

    return () => {
      clearTimeout(t1)
      clearTimeout(timerRef.current)
    }
  }, [])

  function dismiss() {
    if (dismissedRef.current) return
    dismissedRef.current = true
    clearTimeout(timerRef.current)

    setBodyVisible(false)

    setTimeout(() => {
      const headerEl = headerRef?.current
      setSplashHeight(`${headerEl ? headerEl.getBoundingClientRect().bottom : 0}px`)
    }, 80)

    setTimeout(() => onRevealPage(), 380)
    setTimeout(() => setShellVisible(false), 760)
    setTimeout(() => { setGone(true); onDone() }, 980)
  }

  if (gone) return null

  return (
    <div
      className={`${styles.overlay} ${!shellVisible ? styles.shellHidden : ""}`}
      style={{ height: splashHeight }}
    >
      <div className={`${styles.content} ${!bodyVisible ? styles.bodyHidden : ""}`}>
        <div className={styles.trophy}>🏆</div>
        <p className={styles.eyebrow}>CoverMyMeds · PCLT Presents</p>
        <h1 className={styles.title}>Employee<br />of the Month</h1>
        <p className={styles.tagline}>{monthLabel} · The stakes could not be lower</p>

        <blockquote className={`${styles.quoteBlock} ${!quoteVisible ? styles.quoteHidden : ""}`}>
          <p className={styles.quoteText}>{quotes[quoteIndex].text}</p>
          <cite className={styles.quoteAttr}>— {quotes[quoteIndex].attr}</cite>
        </blockquote>
      </div>
    </div>
  )
}
