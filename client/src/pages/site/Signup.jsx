import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { errorMessage } from '../../api/client';
import Icon from '../../components/Icon';
import { maskPhone, US_PHONE_HINT, US_PHONE_PATTERN } from '../../utils/phone';
import { homeFor, useAuth } from '../../context/AuthContext';

const EMPTY = { name: '', email: '', phone: '', password: '', confirm: '', acceptTerms: false };

const Signup = () => {
    const { user, signup } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState(EMPTY);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    if (user) return <Navigate to={homeFor(user)} replace />;

    const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });
    const mismatch = form.confirm.length > 0 && form.password !== form.confirm;

    const submit = async (event) => {
        event.preventDefault();
        if (form.password !== form.confirm) { setError('The two passwords do not match.'); return; }
        setBusy(true);
        setError('');
        try {
            const { confirm, ...details } = form; // eslint-disable-line no-unused-vars
            const created = await signup(details);
            navigate(homeFor(created), { replace: true });
        }
        catch (err) { setError(errorMessage(err)); setBusy(false); }
    };

    return (<section className="auth-wrap">
      <form className="card auth-card stack" onSubmit={submit}>
        <div>
          <h1>Create your account</h1>
          <p className="muted">Book and manage your appointments online.</p>
        </div>
        {error && <div className="alert" role="alert">{error}</div>}
        <label className="field">Full name<input required autoFocus autoComplete="name" minLength={2} maxLength={120} value={form.name} onChange={set('name')} /></label>
        <div className="two-col">
          <label className="field">Email<input type="email" required autoComplete="email" value={form.email} onChange={set('email')} /></label>
          <label className="field"><span>Phone <small>(optional)</small></span><input type="tel" inputMode="tel" autoComplete="tel" maxLength={14} placeholder="(555) 123-4567" pattern={US_PHONE_PATTERN} title={US_PHONE_HINT} value={form.phone} onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value, form.phone) })} /></label>
        </div>
        <label className="field">Password
          <span className="input-affix">
            <input type={showPassword ? 'text' : 'password'} required minLength={8} maxLength={72} autoComplete="new-password" value={form.password} onChange={set('password')} />
            <button type="button" className="icon-btn" onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}><Icon name={showPassword ? 'eye-off' : 'eye'} size={17} /></button>
          </span>
          <small>At least 8 characters.</small>
        </label>
        <label className="field">Confirm password
          <input type={showPassword ? 'text' : 'password'} required autoComplete="new-password" value={form.confirm} onChange={set('confirm')} aria-invalid={mismatch} />
          {mismatch && <small className="field-error">Passwords do not match.</small>}
        </label>
        <label className="field check">
          <input type="checkbox" required checked={form.acceptTerms} onChange={(e) => setForm({ ...form, acceptTerms: e.target.checked })} />
          I agree to the terms of use and privacy policy
        </label>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        <p className="auth-alt">Already have an account? <Link to="/login">Log in</Link></p>
      </form>
    </section>);
};

export default Signup;
