/** Monoline species glyphs (24×24, currentColor). Decorative unless a label is given. */

const PATHS = {
  dog: (
    <>
      <path d="M7.6 6.1C9.2 4.9 14.8 4.9 16.4 6.1C17.8 7.2 18 10 18 13.1C18 17 15.5 19.6 12 19.6C8.5 19.6 6 17 6 13.1C6 10 6.2 7.2 7.6 6.1Z" />
      <path d="M7.6 6.1C5.6 5.6 3.4 7.1 3.4 10.1C3.4 12.2 4.5 13.6 6 13.6" />
      <path d="M16.4 6.1C18.4 5.6 20.6 7.1 20.6 10.1C20.6 12.2 19.5 13.6 18 13.6" />
      <path d="M10.7 14.6H13.3L12 15.9Z" fill="currentColor" />
      <path d="M12 15.9V16.8M12 16.8C11.4 17.5 10.5 17.5 9.9 17M12 16.8C12.6 17.5 13.5 17.5 14.1 17" />
      <circle cx="9.6" cy="11.2" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="14.4" cy="11.2" r="0.75" fill="currentColor" stroke="none" />
    </>
  ),
  cat: (
    <>
      <path d="M5.2 10.4L5.6 4.2L9.6 7.3C11.1 6.9 12.9 6.9 14.4 7.3L18.4 4.2L18.8 10.4C19.5 11.5 19.9 12.7 19.9 14C19.9 17.8 16.4 19.8 12 19.8C7.6 19.8 4.1 17.8 4.1 14C4.1 12.7 4.5 11.5 5.2 10.4Z" />
      <path d="M11.1 15.1H12.9L12 16Z" fill="currentColor" />
      <path d="M12 16V16.7M12 16.7C11.5 17.3 10.7 17.3 10.2 16.9M12 16.7C12.5 17.3 13.3 17.3 13.8 16.9" />
      <path d="M2.4 14.4L6.4 15M2.6 17.2L6.4 16.4M21.6 14.4L17.6 15M21.4 17.2L17.6 16.4" />
      <circle cx="9.3" cy="12.6" r="0.75" fill="currentColor" stroke="none" />
      <circle cx="14.7" cy="12.6" r="0.75" fill="currentColor" stroke="none" />
    </>
  ),
}

export default function SpeciesGlyph({ species = 'dog', size = 24, label = null, className = '' }) {
  return (
    <svg
      className={className || undefined}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : 'true'}
      focusable="false"
    >
      {PATHS[species] || PATHS.dog}
    </svg>
  )
}
