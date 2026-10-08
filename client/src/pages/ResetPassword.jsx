import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../api/client';
import Icon from '../components/Icon';

const ResetPassword = () => {
    const [params] = useSearchParams();
    const token = params.get('token') || '';
    const navigate = useNavigate();
    const [form, setForm] = useState({ password: '', confirm: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const mismatch = form.confirm.length > 0 && form.password !== form.confirm;

    if (!token) {
        return (<section className="auth-wrap">
          <div className="card auth-card stack">
            <h1>Reset link not valid</h1>
            <p className="muted">This link is missing its token. Please request a new one.</p>
            <Link className="btn btn-primary btn-block" to="/forgot-password">Request a new link</Link>
          </div>
        </section>);
    }

    const submit = async (event) => {
        event.preventDefault();
        if (mismatch || form.password !== form.confirm) { setError('The two passwords do not match.'); return; }
        setBusy(true);
        setError('');
        try {
            await api.post('/auth/reset-password', { token, password: form.password });
            navigate('/login', { replace: true, state: { notice: 'Password updated. Log in with your new password.' } });
        }
        catch (err) { setError(errorMessage(err)); setBusy(false); }
    };

    return (<section className="auth-wrap">
      <form className="card auth-card stack" onSubmit={submit}>
        <div>
          <h1>Choose a new password</h1>
          <p className="muted">Use at least 8 characters.</p>
        </div>
        {error && <div className="alert" role="alert">{error} {error.includes('expired') && <Link to="/forgot-password">Request a new link</Link>}</div>}
        <label className="field">New password
          <span className="input-affix">
            <input type={showPassword ? 'text' : 'password'} required autoFocus minLength={8} maxLength={72} autoComplete="new-password"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button type="button" className="icon-btn" onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}><Icon name={showPassword ? 'eye-off' : 'eye'} size={17} /></button>
          </span>
        </label>
        <label className="field">Confirm new password
          <input type={showPassword ? 'text' : 'password'} required autoComplete="new-password" value={form.confirm}
            onChange={(e) => setForm({ ...form, confirm: e.target.value })} aria-invalid={mismatch} />
          {mismatch && <small className="field-error">Passwords do not match.</small>}
        </label>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
      </form>
    </section>);
};

export default ResetPassword;
