import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '../api/client';
import Icon from '../components/Icon';
import { homeFor, useAuth } from '../context/AuthContext';

const Login = () => {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const notice = useLocation().state?.notice;
    const [form, setForm] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    if (user) return <Navigate to={homeFor(user)} replace />;

    const submit = async (event) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        try {
            const signedIn = await login(form.email, form.password);
            navigate(homeFor(signedIn), { replace: true });
        }
        catch (err) { setError(errorMessage(err)); setBusy(false); }
    };

    return (<section className="auth-wrap">
      <form className="card auth-card stack" onSubmit={submit}>
        <div>
          <h1>Welcome back</h1>
          <p className="muted">Log in to manage your appointments.</p>
        </div>
        {notice && !error && <div className="alert alert-ok" role="status">{notice}</div>}
        {error && <div className="alert" role="alert">{error}</div>}
        <label className="field">Email
          <input type="email" required autoFocus autoComplete="username" placeholder="you@example.com" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label className="field">Password
          <span className="input-affix">
            <input type={showPassword ? 'text' : 'password'} required autoComplete="current-password" placeholder="Your password"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button type="button" className="icon-btn" onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}><Icon name={showPassword ? 'eye-off' : 'eye'} size={17} /></button>
          </span>
        </label>
        <p className="auth-alt" style={{ textAlign: 'right', marginTop: -6 }}><Link to="/forgot-password">Forgot password?</Link></p>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        <p className="auth-alt">New here? <Link to="/signup">Create an account</Link></p>
      </form>
    </section>);
};

export default Login;
