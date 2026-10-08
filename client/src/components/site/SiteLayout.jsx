import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { homeFor, useAuth } from '../../context/AuthContext';
import Icon from '../Icon';
import Logo, { BRAND } from '../Logo';
import { useLogoutConfirm } from '../LogoutConfirm';
import useScrolled from './useScrolled';

const LINKS = [
    { to: '/', label: 'Home', end: true },
    { to: '/about', label: 'About' },
    { to: '/gallery', label: 'Gallery' },
    { to: '/faq', label: 'FAQ' },
];

const SiteLayout = () => {
    const { user } = useAuth();
    const askLogout = useLogoutConfirm();
    const { pathname } = useLocation();
    const [open, setOpen] = useState(false);
    const scrolled = useScrolled();

    // Close the mobile menu on navigation and scroll each page to the top.
    useEffect(() => { setOpen(false); window.scrollTo(0, 0); }, [pathname]);

    return (<div className="site theme-brand">
      <header className={`site-header${scrolled ? ' scrolled' : ''}`}>
        <Logo tone="chip" size={42} />
        <button type="button" className="site-burger" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
          <Icon name={open ? 'x' : 'menu'} size={22} />
        </button>
        <nav className={`site-nav${open ? ' open' : ''}`} aria-label="Primary">
          <div className="site-links">
            {LINKS.map((link) => <NavLink key={link.to} to={link.to} end={link.end}>{link.label}</NavLink>)}
          </div>
          <div className="site-cta">
            {user ? (<>
              <Link to={homeFor(user)} className="pill-btn">Dashboard</Link>
              <button type="button" className="pill-btn pill-ghost" onClick={askLogout}><Icon name="log-out" size={15} />Log out</button>
            </>) : (<>
              <Link to="/login" className="text-link">Log in</Link>
              <Link to="/signup" className="pill-btn">Sign up</Link>
            </>)}
          </div>
        </nav>
      </header>

      <main className="site-main"><Outlet /></main>

      <footer className="site-footer">
        <div className="site-footer-grid">
          <div>
            <Logo tone="dark" size={46} slogan />
            <p>Online appointment booking for people who value their time, and for the teams who look after them.</p>
          </div>
          <div>
            <h4>Explore</h4>
            {LINKS.map((link) => <Link key={link.to} to={link.to}>{link.label}</Link>)}
          </div>
          <div>
            <h4>Account</h4>
            {user ? (<>
              <Link to={homeFor(user)}>Dashboard</Link>
              <button type="button" className="footer-link" onClick={askLogout}>Log out</button>
            </>) : (<>
              <Link to="/signup">Create an account</Link>
              <Link to="/login">Log in</Link>
            </>)}
          </div>
        </div>
        <div className="site-footer-bar">© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</div>
      </footer>
    </div>);
};

export default SiteLayout;
