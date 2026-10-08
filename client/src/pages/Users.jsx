import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from '../api/client';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';

const EMPTY = { name: '', email: '', password: '', role: 'staff' };

const CreateUserModal = ({ onClose, onCreated }) => {
    const [form, setForm] = useState(EMPTY);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

    const submit = async (event) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        try { await api.post('/users', form); onCreated(); }
        catch (err) { setError(errorMessage(err)); setBusy(false); }
    };

    return (<Modal title="Add user" onClose={onClose} width={460}>
      <form className="stack" onSubmit={submit}>
        {error && <div className="alert" role="alert">{error}</div>}
        <label className="field">Full name<input required autoFocus value={form.name} onChange={set('name')} /></label>
        <label className="field">Email<input type="email" required value={form.email} onChange={set('email')} /></label>
        <label className="field">Temporary password
          <input type="password" required minLength={8} autoComplete="new-password" value={form.password} onChange={set('password')} />
          <small>At least 8 characters. Share it securely; the user can be reset by an admin later.</small>
        </label>
        <label className="field">Role
          <select value={form.role} onChange={set('role')}><option value="staff">Staff</option><option value="admin">Admin</option></select>
        </label>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create user'}</button>
        </div>
      </form>
    </Modal>);
};

const Users = () => {
    const { user: me } = useAuth();
    const [users, setUsers] = useState(null);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    const load = useCallback(() => api.get('/users').then((r) => setUsers(r.data.users)).catch((e) => setError(errorMessage(e))), []);
    useEffect(() => { load(); }, [load]);

    const patch = async (id, changes) => {
        setError('');
        try { await api.patch(`/users/${id}`, changes); await load(); }
        catch (err) { setError(errorMessage(err)); }
    };

    return (<>
      <PageHeader title="Users" subtitle="Create accounts and manage who can sign in.">
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><Icon name="plus" size={16} />Add user</button>
      </PageHeader>
      {error && <div className="alert" role="alert">{error}</div>}

      <div className="card">
        {users === null ? <div className="skeleton" style={{ height: 200 }} /> : users.length === 0 ? (
          <EmptyState icon="users" title="No users yet" />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>User</th><th>Role</th><th>Status</th><th /></tr></thead>
              <tbody>
                {users.map((u) => {
                    const isMe = u._id === me._id;
                    return (<tr key={u._id}>
                      <td><div className="cell-user">
                        <span className="avatar">{u.name.slice(0, 1)}</span>
                        <div><strong>{u.name}{isMe && <span className="badge badge-gray" style={{ marginLeft: 8 }}>You</span>}</strong><small>{u.email}</small></div>
                      </div></td>
                      <td>
                        {u.role === 'client' ? <span className="badge badge-gray">Client</span> : (
                          <select className="select-inline" value={u.role} disabled={isMe} aria-label={`Role for ${u.name}`}
                            onChange={(e) => patch(u._id, { role: e.target.value })}>
                            <option value="staff">Staff</option><option value="admin">Admin</option>
                          </select>)}
                      </td>
                      <td><span className={`badge badge-dot ${u.active ? 'badge-green' : 'badge-gray'}`}>{u.active ? 'Active' : 'Inactive'}</span></td>
                      <td className="actions">
                        {!isMe && <button type="button" className={`btn-text${u.active ? ' danger' : ''}`} onClick={() => patch(u._id, { active: !u.active })}>
                          {u.active ? 'Deactivate' : 'Activate'}</button>}
                      </td>
                    </tr>);
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {creating && <CreateUserModal onClose={() => setCreating(false)} onCreated={() => { setCreating(false); load(); }} />}
    </>);
};

export default Users;
