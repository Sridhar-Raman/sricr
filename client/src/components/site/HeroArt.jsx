/** Original flat illustration: a standing calendar, a clock and a confirmation tick, with a patient (the Client) and a doctor (the User) booking an appointment. */
const DAYS = Array.from({ length: 28 }, (_, i) => ({ col: i % 7, row: Math.floor(i / 7), i }));
const FILLED = new Set([2, 3, 9, 10, 16, 17, 23]);

/** The client (a patient): everyday clothes — an orange sweater, jeans and trainers. */
const Patient = ({ x, height = 0 }) => (
  <g transform={`translate(${x} ${-height})`}>
    <rect x="-12" y="232" width="10" height="90" rx="4" fill="#5b2a40" />
    <rect x="3" y="232" width="10" height="90" rx="4" fill="#5b2a40" />
    <path d="M-18 318 H-1 V326 H-20Z" fill="#fff" stroke="#4c223d" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M2 318 H19 V326 H4Z" fill="#fff" stroke="#4c223d" strokeWidth="2.5" strokeLinejoin="round" />
    <path d="M-25 152 Q-25 128 0 128 Q25 128 25 152 L25 244 H-25Z" fill="#cf8fab" />
    <path d="M-25 236 H25 V246 H-25Z" fill="#a96a85" />
    <rect x="-5" y="116" width="10" height="16" rx="4" fill="#f0c19a" />
    <path d="M-10 129 Q0 142 10 129 Q0 123 -10 129Z" fill="#f0c19a" />
    <circle cx="0" cy="102" r="17" fill="#f0c19a" />
    <path d="M-18 102 Q-20 80 0 80 Q20 80 18 102 Q10 91 -2 93 Q-12 94 -18 102Z" fill="#3a2418" />
    <circle cx="-6" cy="103" r="1.6" fill="#4c223d" /><circle cx="6" cy="103" r="1.6" fill="#4c223d" />
    <path d="M-4 111 Q0 114 4 111" stroke="#4c223d" strokeWidth="1.8" fill="none" strokeLinecap="round" />
  </g>
);

/** The user (a doctor): white coat, stethoscope, name badge and glasses. */
const Doctor = ({ x, height = 0 }) => (
  <g transform={`translate(${x} ${-height})`}>
    <rect x="-12" y="240" width="10" height="82" rx="4" fill="#4c223d" />
    <rect x="3" y="240" width="10" height="82" rx="4" fill="#4c223d" />
    <ellipse cx="-7" cy="324" rx="13" ry="5" fill="#2a1022" />
    <ellipse cx="9" cy="324" rx="13" ry="5" fill="#2a1022" />
    {/* scrubs under the coat, then the coat itself */}
    <path d="M-12 130 L0 172 L12 130Z" fill="#8a4a63" />
    <path d="M-26 152 Q-26 128 0 128 Q26 128 26 152 L30 268 H-30Z" fill="#ffffff" stroke="#e0d6dc" strokeWidth="2" />
    <path d="M-9 130 L-4 268 M9 130 L4 268" stroke="#e0d6dc" strokeWidth="2" fill="none" />
    <path d="M-12 130 L0 172 L12 130" fill="#8a4a63" opacity=".0" />
    {/* stethoscope */}
    <path d="M-10 130 Q-17 168 -3 184 M10 130 Q17 168 3 184" stroke="#4c223d" strokeWidth="3" fill="none" strokeLinecap="round" />
    <circle cx="0" cy="187" r="6" fill="#4c223d" /><circle cx="0" cy="187" r="2.6" fill="#b9849a" />
    {/* badge + pocket */}
    <rect x="12" y="160" width="11" height="7" rx="1.5" fill="#b9849a" />
    <rect x="-23" y="196" width="16" height="14" rx="2" fill="none" stroke="#e0d6dc" strokeWidth="2" />
    <rect x="-18" y="190" width="2.5" height="10" rx="1" fill="#8a4a63" />
    <rect x="-5" y="116" width="10" height="16" rx="4" fill="#d99a6c" />
    <circle cx="0" cy="102" r="17" fill="#d99a6c" />
    <path d="M-18 100 Q-18 80 0 80 Q18 80 18 100 Q9 92 -3 93 Q-12 94 -18 100Z" fill="#1a1226" />
    <circle cx="-6.5" cy="103" r="5" fill="none" stroke="#4c223d" strokeWidth="1.8" /><circle cx="6.5" cy="103" r="5" fill="none" stroke="#4c223d" strokeWidth="1.8" />
    <path d="M-1.5 103 H1.5" stroke="#4c223d" strokeWidth="1.8" />
    <path d="M-4 112 Q0 115 4 112" stroke="#4c223d" strokeWidth="1.8" fill="none" strokeLinecap="round" />
  </g>
);

/** Small role tag floating above a person. */
const RoleTag = ({ x, y, label, dot }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x="-33" y="-12" width="66" height="24" rx="12" fill="#ffffff" />
    <circle cx="-19" cy="0" r="4" fill={dot} />
    <text x="-11" y="4.5" fontFamily="Inter, system-ui, sans-serif" fontSize="12.5" fontWeight="700" fill="#4c223d" letterSpacing=".02em">{label}</text>
  </g>
);

const HeroArt = () => (
  <svg className="hero-art" viewBox="0 0 580 440" role="img" aria-label="Illustration of a doctor, tagged User, and a patient, tagged Client, booking an appointment on a calendar">
    <defs>
      <linearGradient id="ha-orange" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e3c4d3" /><stop offset="1" stopColor="#a96a85" /></linearGradient>
      <linearGradient id="ha-blue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8a4a63" /><stop offset="1" stopColor="#5a2e3c" /></linearGradient>
    </defs>

    {/* ground blob */}
    <path d="M36 372 Q36 338 84 338 H496 Q544 338 544 372 Q544 406 496 406 H368 Q344 430 296 430 H214 Q170 430 156 406 H84 Q36 406 36 372Z" fill="url(#ha-orange)" />

    {/* leaves */}
    <g>
      <path d="M70 300 Q40 240 92 196 Q128 244 70 300Z" fill="#8a4a63" />
      <path d="M70 300 Q92 250 92 196" stroke="#d3b1c2" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M44 330 Q8 286 44 246 Q86 288 44 330Z" fill="url(#ha-orange)" />
      <path d="M510 300 Q540 240 488 196 Q452 244 510 300Z" fill="url(#ha-orange)" />
      <path d="M536 330 Q572 286 536 246 Q494 288 536 330Z" fill="#8a4a63" />
    </g>

    {/* standing calendar */}
    <g>
      <path d="M118 338 L138 112 H168 L148 338Z" fill="#8a4a63" opacity=".55" />
      <rect x="138" y="106" width="304" height="232" rx="16" fill="#f6f1f3" />
      <path d="M138 122 Q138 106 154 106 H426 Q442 106 442 122 V150 H138Z" fill="url(#ha-blue)" />
      {[0, 1, 2, 3, 4, 5].map((n) => (
        <g key={n} transform={`translate(${168 + n * 46} 86)`}>
          <rect width="12" height="42" rx="6" fill="#efe3ea" stroke="#8a4a63" strokeWidth="3" />
        </g>
      ))}
      <rect x="162" y="164" width="64" height="9" rx="4.5" fill="#4c223d" />
      <rect x="236" y="164" width="40" height="9" rx="4.5" fill="#4c223d" opacity=".4" />
      {DAYS.map(({ col, row, i }) => (
        <rect key={i} x={160 + col * 38} y={188 + row * 34} width="26" height="22" rx="5"
          fill={FILLED.has(i) ? '#8a4a63' : '#ece1e7'} stroke={FILLED.has(i) ? 'none' : '#cdb3c1'} strokeWidth="1.5" />
      ))}
      <circle cx={160 + 4 * 38 + 13} cy={188 + 2 * 34 + 11} r="19" fill="none" stroke="#b9849a" strokeWidth="5" />
    </g>

    {/* clock */}
    <g transform="translate(468 104)">
      <circle r="60" fill="#fff" stroke="url(#ha-orange)" strokeWidth="12" />
      {[0, 90, 180, 270].map((deg) => <rect key={deg} x="-2.5" y="-46" width="5" height="10" rx="2.5" fill="#4c223d" transform={`rotate(${deg})`} />)}
      <path d="M0 0 V-34" stroke="#4c223d" strokeWidth="6" strokeLinecap="round" />
      <path d="M0 0 L24 12" stroke="#4c223d" strokeWidth="6" strokeLinecap="round" />
      <circle r="6" fill="#b9849a" />
    </g>

    {/* confirmed tick */}
    <g transform="translate(300 72)">
      <circle r="32" fill="url(#ha-orange)" />
      <path d="M-14 1 L-4 12 L15 -10" stroke="#fff" strokeWidth="8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </g>

    {/* people: the client (patient) on the left, the user (doctor) on the right */}
    <g transform="translate(0 6)">
      <Patient x={232} height={6} />
      <Doctor x={372} height={20} />
      {/* arms meeting in the middle: orange sweater sleeve, white coat sleeve, a hand each */}
      <path d="M254 170 L300 152" stroke="#cf8fab" strokeWidth="10" strokeLinecap="round" />
      <circle cx="303" cy="151" r="5.5" fill="#f0c19a" />
      <path d="M348 150 L314 142" stroke="#ffffff" strokeWidth="10" strokeLinecap="round" />
      <circle cx="311" cy="141" r="5.5" fill="#d99a6c" />
    </g>
    <RoleTag x={232} y={62} label="Client" dot="#b9849a" />
    <RoleTag x={372} y={48} label="User" dot="#8a4a63" />
  </svg>
);

export default HeroArt;
