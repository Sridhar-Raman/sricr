import { Link } from 'react-router-dom';

export const BRAND = { name: 'SRI.CR', first: 'SRI', second: 'CR', slogan: 'Appointments made easy.' };

/**
 * The brand mark: a rounded badge with a bold "S" monogram and a dot (the "." of SRI.CR). Original SVG drawn with
 * theme colours so it sits on any background: `--logo-a` is the badge, `--logo-ink` the monogram on top of it.
 */
export const LogoMark = ({ size = 44, className = '' }) => (
  <svg className={`logo-mark ${className}`} width={size} height={size} viewBox="0 0 120 120" role="img" aria-label={`${BRAND.name} logo`}>
    <rect x="4" y="4" width="112" height="112" rx="32" fill="var(--logo-a)" />
    <path d="M82 40 C76 30 62 26 52 29 C40 33 37 46 46 53 C55 60 74 62 80 72 C86 82 80 94 66 96 C54 98 42 93 36 83"
      fill="none" stroke="var(--logo-ink)" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="92" cy="92" r="9" fill="var(--logo-ink)" />
  </svg>
);

/**
 * Logo lock-up: mark + "SRI.CR" wordmark (+ slogan).
 * tone: "chip" (white pill), "dark" (navy / plum backgrounds), "rail" (staff side menu).
 */
const Logo = ({ to = '/', tone = 'dark', size = 44, slogan = true, markOnly = false, className = '' }) => {
    const body = (<>
      <LogoMark size={size} />
      {!markOnly && (
        <span className="logo-text">
          <span className="logo-word"><b className="la">{BRAND.first}</b><b className="ld">.</b><b className="lb">{BRAND.second}</b></span>
          {slogan && <span className="logo-slogan">{BRAND.slogan}</span>}
        </span>
      )}
    </>);
    const classes = `logo logo-${tone} ${className}`.trim();
    return to ? <Link to={to} className={classes} aria-label={`${BRAND.name} home`}>{body}</Link> : <span className={classes}>{body}</span>;
};

export default Logo;
