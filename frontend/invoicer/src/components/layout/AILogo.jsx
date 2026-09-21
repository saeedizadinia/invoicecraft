/**
 * Brand mark for Invoicer — a teal invoice document with billing rows and a
 * "$" seal. Renders at 48px, no frame.
 */
const AILogo = () => {
  return (
    <div className="relative h-12 w-12 flex items-center justify-center" aria-label="Invoicer">
      <svg
        width="42"
        height="42"
        viewBox="3.5 1 17 22"
        fill="none"
        className="drop-shadow-[0_4px_10px_rgba(13,148,136,0.25)]"
      >
        <defs>
          <linearGradient id="inv-doc" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2dd4bf" />
            <stop offset="55%" stopColor="#14b8a6" />
            <stop offset="100%" stopColor="#0f766e" />
          </linearGradient>
        </defs>

        {/* Document body with a folded top-right corner */}
        <path
          d="M7 2.75h6.3L18 7.45V19.5A1.75 1.75 0 0 1 16.25 21.25H7A1.75 1.75 0 0 1 5.25 19.5V4.5A1.75 1.75 0 0 1 7 2.75Z"
          fill="url(#inv-doc)"
        />
        {/* Fold */}
        <path d="M13.3 2.9V6.1a1 1 0 0 0 1 1h3.2Z" fill="#ffffff" fillOpacity="0.4" />

        {/* Invoice rows */}
        <rect x="7.7" y="10" width="7.4" height="1.5" rx="0.75" fill="#ffffff" fillOpacity="0.95" />
        <rect x="7.7" y="12.9" width="6.4" height="1.5" rx="0.75" fill="#ffffff" fillOpacity="0.7" />
        <rect x="7.7" y="15.8" width="4.2" height="1.5" rx="0.75" fill="#ffffff" fillOpacity="0.7" />

        {/* "$" seal */}
        <circle cx="16.6" cy="16.7" r="3.5" fill="#ffffff" />
        <text
          x="16.6"
          y="18.55"
          textAnchor="middle"
          fontSize="5.6"
          fontWeight="800"
          fontFamily="Geist, Inter, sans-serif"
          fill="#0f766e"
        >
          $
        </text>
      </svg>
    </div>
  );
};

export default AILogo;
