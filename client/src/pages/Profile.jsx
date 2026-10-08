import { useState } from 'react';
import api, { errorMessage, tokenStore } from '../api/client';
import PageHeader from '../components/PageHeader';
import { maskPhone } from '../utils/phone';
import { useAuth } from '../context/AuthContext';

const ProfileForm = () => {
    const { user, setUser } = useAuth();
    const [form, setForm] = useState({ name: user.name, phone: user.phone || '' });
    const [state, setState] = useState({ busy: false, error: '', ok: '' });

    const submit = async (event) => {
        event.preventDefault();
        setState({ busy: true, error: '', ok: '' });
        try {
            const { data } = await api.patch('/auth/me', form);
            setUser(data.user);
            setState({ busy: false, error: '', ok: 'Profile updated.' });
        }
        catch (err) { setState({ busy: false, error: errorMessage(err), ok: '' }); }
    };

    return (<form className="card card-pad stack" onSubmit={submit}>
      <h2>Your details</h2>
      {state.error && <div className="alert" role="alert">{state.error}</div>}
      {state.ok && <div className="alert alert-ok" role="status">{state.ok}</div>}
      <label className="field">Full name<input required minLength={2} maxLength={120} autoComplete="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
      <div className="two-col">
        <label className="field">Email<input value={user.email} disabled readOnly /></label>
        <label className="field">Phone<input type="tel" inputMode="tel" maxLength={14} autoComplete="tel" placeholder="(555) 123-4567" value={form.phone} onChange={(e) => setForm({ ...form, phone: maskPhone(e.target.value, form.phone) })} /></label>
      </div>
      <div><button type="submit" className="btn btn-primary" disabled={state.busy}>{state.busy ? 'Saving…' : 'Save changes'}</button></div>
    </form>);
};

const PasswordForm = () => {
    const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
    const [state, setState] = useState({ busy: false, error: '', ok: '' });
    const mismatch = form.confirm.length > 0 && form.newPassword !== form.confirm;

    const submit = async (event) => {
        event.preventDefault();
        if (form.newPassword !== form.confirm) { setState({ busy: false, error: 'The two passwords do not match.', ok: '' }); return; }
        setState({ busy: true, error: '', ok: '' });
        try {
            const { data } = await api.post('/auth/change-password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
            tokenStore.set(data.token); // the old token is now invalid; keep this session signed in
            setForm({ currentPassword: '', newPassword: '', confirm: '' });
            setState({ busy: false, error: '', ok: 'Password changed. Other devices have been signed out.' });
        }
        catch (err) { setState({ busy: false, error: errorMessage(err), ok: '' }); }
    };

    return (<form className="card card-pad stack" onSubmit={submit}>
      <h2>Change password</h2>
      {state.error && <div className="alert" role="alert">{state.error}</div>}
      {state.ok && <div className="alert alert-ok" role="status">{state.ok}</div>}
      <label className="field">Current password<input type="password" required autoComplete="current-password" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} /></label>
      <div className="two-col">
        <label className="field">New password<input type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} /></label>
        <label className="field">Confirm new password
          <input type="password" required autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} aria-invalid={mismatch} />
          {mismatch && <small className="field-error">Passwords do not match.</small>}
        </label>
      </div>
      <div><button type="submit" className="btn btn-primary" disabled={state.busy}>{state.busy ? 'Saving…' : 'Change password'}</button></div>
    </form>);
};

const Profile = () => (<>
  <PageHeader title="Profile" subtitle="Your contact details and password" />
  <div className="stack" style={{ maxWidth: 640 }}>
    <ProfileForm />
    <PasswordForm />
  </div>
</>);

export default Profile;
