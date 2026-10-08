import { NavLink, Outlet } from 'react-router-dom';
import Icon from './Icon';
import Logo from './Logo';

// Signed-out visitors get the app's own shell (plum page + side menu), not the marketing site's header and footer.
const ITEMS = [
    { to: '/', label: 'Home', icon: 'home', end: true },
    { to: '/login', label: 'Log in', icon: 'log-in' },
    { to: '/signup', label: 'Sign up', icon: 'user-plus' },
];

/** Purely decorative backdrop for the sign-in pages: gradient glows, a dot grid and drifting line icons. */
const AuthBackdrop = () => (
  <div className="auth-bg" aria-hidden="true">
    <span className="auth-glow g1" /><span className="auth-glow g2" /><span className="auth-glow g3" />

    <svg className="auth-deco deco-calendar" viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="14" y="22" width="92" height="84" rx="10" />
      <path d="M14 46H106M38 12v20M82 12v20" />
      <path d="M30 60h14v12H30zM53 60h14v12H53zM76 60h14v12H76zM30 82h14v12H30zM53 82h14v12H53z" strokeWidth="3.5" />
    </svg>

    <svg className="auth-deco deco-clock" viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="60" cy="60" r="46" />
      <path d="M60 30v30l20 12" />
    </svg>

    <svg className="auth-deco deco-check" viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="60" cy="60" r="46" />
      <path d="m38 62 16 16 30-34" />
    </svg>

    <svg className="auth-deco deco-calendar-sm" viewBox="0 0 120 120" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="14" y="22" width="92" height="84" rx="10" />
      <path d="M14 46H106M38 12v20M82 12v20" />
    </svg>
  </div>
);

const AuthLayout = () => (
  <div className="shell">
    <aside className="sidebar">
      <div className="brand"><Logo to="/" tone="rail" size={36} slogan={false} /></div>
      <nav aria-label="Account">
        {ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end}><Icon name={item.icon} /><span className="nav-text">{item.label}</span></NavLink>
        ))}
      </nav>
    </aside>
    <main className="content auth-content">
      <AuthBackdrop />
      <Outlet />
    </main>
  </div>
);

export default AuthLayout;
