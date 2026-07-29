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

const DURATION = 4500

export default function SplashScreen({ monthLabel, headerRef, onRevealPage, onDone }) {
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)])
  const [barWidth, setBarWidth] = useState(0)
  const [bodyVisible, setBodyVisible] = useState(true)
  const [splashHeight, setSplashHeight] = useState("100vh")
  const [shellVisible, setShellVisible] = useState(true)
  const [gone, setGone] = useState(false)
  const timerRef = useRef(null)
  const dismissedRef = useRef(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setBarWidth(250))
    timerRef.current = setTimeout(() => dismiss(), DURATION)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(timerRef.current)
    }
  }, [])

  function dismiss() {
    if (dismissedRef.current) return
    dismissedRef.current = true
    clearTimeout(timerRef.current)

    // Step 1 (0ms): fade body content
    setBodyVisible(false)

    // Step 2 (80ms): collapse height to match header strip
    setTimeout(() => {
      const headerEl = headerRef?.current
      const targetHeight = headerEl
        ? headerEl.getBoundingClientRect().bottom
        : 0
      setSplashHeight(`${targetHeight}px`)
    }, 80)

    // Step 3 (380ms): reveal main page content
    setTimeout(() => {
      onRevealPage()
    }, 380)

    // Step 4 (760ms): fade the shell
    setTimeout(() => {
      setShellVisible(false)
    }, 760)

    // Step 5 (980ms): done — remove from DOM
    setTimeout(() => {
      setGone(true)
      onDone()
    }, 980)
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

        <blockquote className={styles.quoteBlock}>
          <p className={styles.quoteText}>{quote.text}</p>
          <cite className={styles.quoteAttr}>— {quote.attr}</cite>
        </blockquote>

        <div className={styles.barTrack}>
          <div className={styles.barFill} style={{ width: barWidth }} />
        </div>

        <button className={styles.skip} onClick={dismiss}>skip →</button>
      </div>
    </div>
  )
}
