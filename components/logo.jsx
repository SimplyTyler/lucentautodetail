import Link from "next/link";

export function Logo({ href = "/", compact = false }) {
  return (
    <Link className={`logo ${compact ? "logoCompact" : ""}`} href={href} aria-label="Lucent Auto Detail home">
      <span className="logoMark" aria-hidden="true">
        <span />
      </span>
      <span className="logoType">
        <strong>Lucent</strong>
        {!compact && <small>Auto detail</small>}
      </span>
    </Link>
  );
}
