import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Icon from './Icon';
import Logo from './Logo';
import { useLogoutConfirm } from './LogoutConfirm';

// One menu for everybody; `roles` limits an entry to those roles. Users (account management) is admin-only.
const NAV = [
    { to: '/app', label: 'Dashboard', icon: 'dashboard', end: true },
    { to: '/app/calendar', label: 'Calendar', icon: 'calendar' },
    { to: '/app/appointment-types', label: 'Appointment Types', icon: 'tag' },
    { to: '/app/my-appointments', label: 'My Appointments', icon: 'calendar-check', roles: ['client'] },
    { to: '/app/book', label: 'Book', icon: 'plus', roles: ['client'] },
    { to: '/app/users', label: 'Users', icon: 'users', roles: ['admin'] },
    { to: '/app/profile', label: 'Profile', icon: 'user' },
];

const Layout = () => {
    const { user } = useAuth();
    const askLogout = useLogoutConfirm();
    return (<div className="shell">
      <aside className="sidebar">
        <div className="brand"><Logo to="/app" tone="rail" size={36} slogan={false} /></div>
        <nav aria-label="Main">
          {NAV.filter((item) => !item.roles || item.roles.includes(user.role)).map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end}><Icon name={item.icon} /><span className="nav-text">{item.label}</span></NavLink>
          ))}
        </nav>
        {/* signed-in user: name and role, with Log out directly beneath */}
        <div className="sidebar-user">
          <div className="sidebar-foot">
            <span className="avatar">{user.name.slice(0, 1)}</span>
            <div className="who"><span>{user.name}</span><small>{user.role}</small></div>
          </div>
          <button type="button" className="sidebar-logout" onClick={askLogout}><Icon name="log-out" /><span className="nav-text">Log out</span></button>
        </div>
      </aside>
      <main className="content"><div className="page"><Outlet /></div></main>
    </div>);
};

export default Layout;
