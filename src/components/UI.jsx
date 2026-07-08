import { colorFor, initials } from '../constants.js'
import styles from './UI.module.css'

export function FrameBar() {
  return (
    <div className={styles.frame}>
      <span className={styles.o} />
      <span className={styles.m} />
      <span className={styles.c} />
      <span className={styles.n} />
    </div>
  )
}

export function Avatar({ name, size = 38, className = "" }) {
  return (
    <span
      className={`${styles.av} ${className}`}
      style={{
        background: colorFor(name),
        width: size,
        height: size,
        fontSize: size < 32 ? 11 : 14,
      }}
    >
      {initials(name)}
    </span>
  )
}

export function Card({ children, className = "" }) {
  return <div className={`${styles.card} ${className}`}>{children}</div>
}

export function Button({ children, variant = "primary", block = false, className = "", ...props }) {
  const cls = [
    styles.btn,
    styles[`btn_${variant}`],
    block ? styles.btn_block : "",
    className,
  ].filter(Boolean).join(" ")
  return <button className={cls} {...props}>{children}</button>
}

export function Note({ children, variant = "orange" }) {
  return <div className={`${styles.note} ${styles[`note_${variant}`]}`}>{children}</div>
}

export function Banner({ children, icon = "ℹ" }) {
  return (
    <div className={styles.banner}>
      <span className={styles.bannerIcon}>{icon}</span>
      <div>{children}</div>
    </div>
  )
}

export function Spinner() {
  return <div className={styles.spinner} aria-label="Loading…" />
}
