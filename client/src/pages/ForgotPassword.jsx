import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import api, { errorMessage } from '../api/client';
import { homeFor, useAuth } from '../context/AuthContext';

const ForgotPassword = () => {
    const { user } = useAuth();
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    if (user) return <Navigate to={homeFor(user)} replace />;

    const submit = async (event) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        try { await api.post('/auth/forgot-password', { email }); setSent(true); }
        catch (err) { setError(errorMessage(err)); }
        finally { setBusy(false); }
    };

    if (sent) {
        return (<section className="auth-wrap">
          <div className="card auth-card stack">
            <h1>Check your email</h1>
            <p className="muted">If an account exists for <strong>{email}</strong>, we've sent a link to reset your password. It expires in 1 hour.</p>
            <p className="auth-alt"><Link to="/login">Back to log in</Link></p>
          </div>
        </section>);
    }

    return (<section className="auth-wrap">
      <form className="card auth-card stack" onSubmit={submit}>
        <div>
          <h1>Forgot your password?</h1>
          <p className="muted">Enter your email and we'll send you a reset link.</p>
        </div>
        {error && <div className="alert" role="alert">{error}</div>}
        <label className="field">Email
          <input type="email" required autoFocus autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
        <p className="auth-alt"><Link to="/login">Back to log in</Link></p>
      </form>
    </section>);
};

export default ForgotPassword;
