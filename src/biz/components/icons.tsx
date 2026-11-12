// Bộ icon SVG dùng chung (thay cho emoji) – nét 1.75px, kế thừa currentColor

type IconProps = { className?: string };

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
};

export function AppleIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-62.6 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

export function AndroidIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.6 9.48l1.84-3.18a.63.63 0 0 0-1.09-.63l-1.88 3.24a11.43 11.43 0 0 0-8.94 0L5.65 5.67a.63.63 0 0 0-1.09.63L6.4 9.48A10.78 10.78 0 0 0 1 18h22a10.78 10.78 0 0 0-5.4-8.52zM7 15.25a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5zm10 0a1.25 1.25 0 1 1 0-2.5 1.25 1.25 0 0 1 0 2.5z" />
    </svg>
  );
}

export function FacebookIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
    </svg>
  );
}

export function CarIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M5 17h14M5 17a2 2 0 01-2-2v-3l2.2-5.1A2 2 0 017 5.7h10a2 2 0 011.8 1.2L21 12v3a2 2 0 01-2 2" />
      <circle cx="7.5" cy="17.5" r="1.8" />
      <circle cx="16.5" cy="17.5" r="1.8" />
      <path d="M3.5 12h17" />
    </svg>
  );
}

export function LandmarkIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 21h18M4 10h16M12 3l8 5H4l8-5zM6 10v8M10 10v8M14 10v8M18 10v8" />
    </svg>
  );
}

export function LanguageIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 5h8M8 3v2M6 5c0 4 3 7 6 8M10 5c0 3-2.5 6.5-6 8" />
      <path d="M13 21l4-9 4 9M14.5 18h5" />
    </svg>
  );
}

export function TargetIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  );
}

export function PhoneIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <path d="M10.5 18.5h3" />
    </svg>
  );
}

export function ChartIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}

export function RefreshIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M20 11a8 8 0 00-14.6-4.5L4 8M4 4v4h4M4 13a8 8 0 0014.6 4.5L20 16M20 20v-4h-4" />
    </svg>
  );
}

export function SparkIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z" />
    </svg>
  );
}

export function CheckIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg {...base} strokeWidth={2.5} className={className}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function ArrowRightIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg {...base} strokeWidth={2} className={className}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function PlusIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg {...base} strokeWidth={2} className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function MenuIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg {...base} strokeWidth={2} className={className}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function CloseIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg {...base} strokeWidth={2} className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function BookIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 6.5C10.5 5.3 8.4 4.5 5.5 4.5H3v14h2.5c2.9 0 5 .8 6.5 2m0-14c1.5-1.2 3.6-2 6.5-2H21v14h-2.5c-2.9 0-5 .8-6.5 2m0-14v14" />
    </svg>
  );
}

export function ClipboardIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3" />
    </svg>
  );
}

export function MailIcon({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3.5 6.5L12 13l8.5-6.5" />
    </svg>
  );
}

/* ───────────── Business (ckk.biz) ───────────── */

export function BrandMark({ className = 'w-9 h-9' }: IconProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <rect width="40" height="40" fill="#2438C9" />
      <path d="M24.5 13.2a8 8 0 100 13.6" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="28" cy="20" r="2.6" fill="#F4B400" />
    </svg>
  );
}

export function ShieldIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3l7.5 3v5.5c0 4.6-3.2 8.3-7.5 9.5-4.3-1.2-7.5-4.9-7.5-9.5V6L12 3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

export function GlobeIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
    </svg>
  );
}

export function BriefcaseIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8.5 7V5.5A1.5 1.5 0 0110 4h4a1.5 1.5 0 011.5 1.5V7M3 12.5h18" />
    </svg>
  );
}

export function LockIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 018 0v3" />
    </svg>
  );
}

export function DocumentIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </svg>
  );
}

export function TrashIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" />
    </svg>
  );
}

export function ReceiptIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </svg>
  );
}

export function ClockIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function LayersIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 13l9 5 9-5M3 17.5l9 5 9-5" />
    </svg>
  );
}

export function ChevronDownIcon({ className = 'w-4 h-4' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
