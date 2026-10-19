// A chubby housemate. Shade colour comes from the name (same hash as Avatar); angry turns the body red.
export function Marshmallow({ name, angry = false, className = "" }: { name: string; angry?: boolean; className?: string }) {
  const hue = [...name].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
  const body = angry ? "#ffd9d4" : "#fbfaf5";
  const shade = angry ? "#f08a80" : `hsl(${hue} 85% 86%)`;
  const ink = "#1a1a1a";
  return (
    <svg aria-hidden viewBox="0 0 130 198" className={className} stroke={ink} strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round">
      <ellipse cx="40" cy="184" rx="20" ry="11" fill={body} />
      <ellipse cx="90" cy="184" rx="20" ry="11" fill={body} />
      <path d="M32 84Q18 128 26 162Q30 178 46 178H60Q62 168 65 168Q68 168 70 178H84Q100 178 104 162Q112 128 98 84Z" fill={body} />
      <path d="M30 96Q4 94 6 120Q8 140 30 136Q40 134 38 122Z" fill={body} />
      <path d="M100 96Q126 94 124 120Q122 140 100 136Q90 134 92 122Z" fill={body} />
      <path d="M33 90Q22 128 29 160Q32 171 38 175Q31 150 37 122Q39 104 41 90Z" fill={shade} stroke="none" />
      <path d="M10 112Q10 100 22 99Q16 107 16 118Q16 130 24 133Q8 134 10 112Z" fill={shade} stroke="none" />
      <ellipse cx="65" cy="48" rx="56" ry="42" fill={body} />
      <path d="M12 50Q12 14 55 6Q30 22 32 50Q34 70 56 84Q12 80 12 50Z" fill={shade} stroke="none" />
      <g fill={ink}>
        <g className="mm-eyes" stroke="none">
          <circle cx="47" cy={angry ? 54 : 52} r="4.5" />
          <circle cx="83" cy={angry ? 54 : 52} r="4.5" />
        </g>
        <ellipse cx="37" cy="65" rx="6" ry="4" fill={angry ? "#e5483c" : "#ff9a9a"} stroke="none" opacity={angry ? 0.5 : 0.6} />
        <ellipse cx="93" cy="65" rx="6" ry="4" fill={angry ? "#e5483c" : "#ff9a9a"} stroke="none" opacity={angry ? 0.5 : 0.6} />
        {angry ? (
          <>
            <path d="M54 72Q65 63 76 72" fill="none" />
            <path d="M36 40L56 48M94 40L74 48" fill="none" />
          </>
        ) : (
          <>
            <path d="M53 62Q65 74 77 62" fill="none" />
            <path d="M42 34Q47 28 53 33M77 33Q83 28 88 34" fill="none" strokeWidth="2.4" />
          </>
        )}
      </g>
    </svg>
  );
}
