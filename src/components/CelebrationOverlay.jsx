import { useRef, useState } from "react"
import html2canvas from "html2canvas"
import styles from "./CelebrationOverlay.module.css"

function initials(name) {
  return name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()
}

export default function CelebrationOverlay({ data, onClose }) {
  const { winners, featuredComment, voteCount, label } = data
  const cardRef = useRef(null)
  const [copying, setCopying] = useState(false)
  const [copyMsg, setCopyMsg] = useState("")

  async function handleCopyImage() {
    if (!cardRef.current) return
    setCopying(true)
    setCopyMsg("")
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: null,
      })
      canvas.toBlob(async blob => {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ])
          setCopyMsg("Copied!")
        } catch {
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `eotm-${data.month}.png`
          a.click()
          URL.revokeObjectURL(url)
          setCopyMsg("Saved!")
        }
        setCopying(false)
        setTimeout(() => setCopyMsg(""), 2500)
      }, "image/png")
    } catch {
      setCopying(false)
      setCopyMsg("Error — try a screenshot instead")
      setTimeout(() => setCopyMsg(""), 3000)
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <button
        className={styles.closeBtn}
        onClick={e => { e.stopPropagation(); onClose() }}
        aria-label="Close"
      >
        ✕
      </button>

      <div className={styles.cardWrap} onClick={e => e.stopPropagation()}>
        <div className={styles.card} ref={cardRef}>

          {/* Rainbow bar — top */}
          <div className={styles.rainbowBar} />

          {/* Slim navy header strip */}
          <div className={styles.headerStrip}>
            <div>
              <div className={styles.headerEyebrow}>CoverMyMeds · PCLT Team</div>
              <div className={styles.headerTitle}>Employee of the Month</div>
            </div>
            <div className={styles.monthBadge}>{label.toUpperCase()}</div>
          </div>

          {/* Team photo */}
          <div className={styles.photoSection}>
            <img
              src={`${import.meta.env.BASE_URL}eotm-winner-image.jpg`}
              alt="PCLT Team"
              crossOrigin="anonymous"
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </div>

          {/* Trophy divider */}
          <div className={styles.trophyDivider}>
            <div className={styles.trophyLine} style={{ background: "linear-gradient(90deg, transparent, #E0EAF0)" }} />
            <span className={styles.trophyIcon}>🏆</span>
            <div className={styles.trophyLine} style={{ background: "linear-gradient(90deg, #E0EAF0, transparent)" }} />
          </div>

          {/* Winner block */}
          <div className={styles.winnerBlock}>
            <div className={`${styles.avatarRow} ${winners.length > 1 ? styles.avatarRowMulti : ""}`}>
              {winners.map(name => (
                <div key={name} className={styles.avatar}>
                  {initials(name)}
                </div>
              ))}
            </div>
            <p className={styles.winnerName}>{winners.join(" & ")}</p>
            {featuredComment && (
              <p className={styles.comment}>"{featuredComment}"</p>
            )}
            <p className={styles.meta}>
              {voteCount != null ? `${voteCount} ${voteCount === 1 ? "vote" : "votes"} · ` : ""}PCLT Team
            </p>
          </div>

          {/* Rainbow bar — bottom */}
          <div className={styles.rainbowBar} />
        </div>

        <div className={styles.copyRow}>
          <button className={styles.copyBtn} onClick={handleCopyImage} disabled={copying}>
            {copying ? "Capturing…" : "Copy image"}
          </button>
          {copyMsg && <span className={styles.copyMsg}>{copyMsg}</span>}
        </div>
      </div>
    </div>
  )
}
