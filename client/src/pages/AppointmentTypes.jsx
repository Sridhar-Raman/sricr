import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../api/client';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';

const EMPTY = { name: '', description: '', durationMinutes: 30, bufferMinutes: 0, color: '#703a4b', active: true };

const TypeModal = ({ type, onClose, onSaved }) => {
    const [form, setForm] = useState(() => (type ? {
        name: type.name, description: type.description, durationMinutes: type.durationMinutes,
        bufferMinutes: type.bufferMinutes, color: type.color, active: type.active,
    } : EMPTY));
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });

    const submit = async (event) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        const body = { ...form, durationMinutes: Number(form.durationMinutes), bufferMinutes: Number(form.bufferMinutes) };
        try {
            if (type) await api.put(`/appointment-types/${type._id}`, body);
            else await api.post('/appointment-types', body);
            onSaved();
        }
        catch (err) { setError(errorMessage(err)); setBusy(false); }
    };

    return (<Modal title={type ? 'Edit appointment type' : 'New appointment type'} onClose={onClose} width={540}>
      <form className="stack" onSubmit={submit}>
        {error && <div className="alert" role="alert">{error}</div>}
        <div className="form-grid">
          <label className="field span-2">Name<input required autoFocus value={form.name} onChange={set('name')} placeholder="e.g. Initial consultation" /></label>
          <label className="field">Duration (minutes)<input type="number" min={5} max={480} required value={form.durationMinutes} onChange={set('durationMinutes')} /></label>
          <label className="field">Buffer after (minutes)<input type="number" min={0} max={120} value={form.bufferMinutes} onChange={set('bufferMinutes')} /></label>
          <label className="field span-2">Description<textarea rows={2} maxLength={500} value={form.description} onChange={set('description')} /></label>
          <label className="field">Calendar colour<input type="color" value={form.color} onChange={set('color')} /></label>
          <label className="field check" style={{ alignSelf: 'end', height: 38 }}>
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />Active (can be booked)
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : (type ? 'Save changes' : 'Add type')}</button>
        </div>
      </form>
    </Modal>);
};

const AppointmentTypes = () => {
    const { isAdmin, isClient } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [statusFilter, setStatusFilter] = useState(() => (['active', 'inactive'].includes(searchParams.get('status')) ? searchParams.get('status') : 'all'));
    const [types, setTypes] = useState(null);
    const [modal, setModal] = useState(null); // { type? }
    const [error, setError] = useState('');

    const load = useCallback(() => api.get('/appointment-types').then((r) => setTypes(r.data.appointmentTypes)).catch((e) => setError(errorMessage(e))), []);
    useEffect(() => { load(); }, [load]);

    const pickFilter = (value) => {
        setStatusFilter(value);
        setSearchParams(value === 'all' ? {} : { status: value }, { replace: true });
    };
    const counts = useMemo(() => ({
        all: types?.length ?? 0, active: types?.filter((t) => t.active).length ?? 0, inactive: types?.filter((t) => !t.active).length ?? 0,
    }), [types]);
    const shown = (types || []).filter((t) => statusFilter === 'all' || (statusFilter === 'active') === t.active);

    const remove = async (type) => {
        if (!window.confirm(`Delete "${type.name}"? Types already used by appointments are deactivated instead.`)) return;
        setError('');
        try { await api.delete(`/appointment-types/${type._id}`); await load(); }
        catch (err) { setError(errorMessage(err)); }
    };

    return (<>
      <PageHeader title="Appointment types" subtitle="Define what can be booked, how long it takes and how it looks on the calendar.">
        {isAdmin && <button type="button" className="btn btn-primary" onClick={() => setModal({})}><Icon name="plus" size={16} />Add type</button>}
      </PageHeader>
      {error && <div className="alert" role="alert">{error}</div>}

      {!isClient && types && types.length > 0 && (<div className="segmented tabs types-filter" role="tablist" aria-label="Filter appointment types">
        {[['all', 'All'], ['active', 'Active'], ['inactive', 'Inactive']].map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={statusFilter === key} className={statusFilter === key ? 'active' : ''} onClick={() => pickFilter(key)}>{label} ({counts[key]})</button>
        ))}
      </div>)}

      <div className="card">
        {types === null ? <div className="skeleton" style={{ height: 200 }} /> : types.length === 0 ? (
          <EmptyState icon="tag" title="No appointment types yet">
            <p>{isAdmin ? 'Add your first type to start booking appointments.' : 'An admin needs to add appointment types.'}</p>
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Type</th><th>Duration</th><th>Buffer</th><th>Status</th>{isAdmin && <th />}</tr></thead>
              <tbody>
                {shown.map((t) => (<tr key={t._id}>
                  <td><span className="type-swatch" style={{ background: t.color }} /><strong>{t.name}</strong>
                    {t.description && <span className="cell-sub" style={{ marginLeft: 22 }}>{t.description}</span>}</td>
                  <td>{t.durationMinutes} min</td>
                  <td>{t.bufferMinutes ? `${t.bufferMinutes} min` : <span className="muted">None</span>}</td>
                  <td><span className={`badge badge-dot ${t.active ? 'badge-green' : 'badge-gray'}`}>{t.active ? 'Active' : 'Inactive'}</span></td>
                  {isAdmin && (<td className="actions">
                    <button type="button" className="icon-btn" aria-label={`Edit ${t.name}`} title="Edit" onClick={() => setModal({ type: t })}><Icon name="pencil" size={16} /></button>
                    <button type="button" className="icon-btn" aria-label={`Delete ${t.name}`} title="Delete" onClick={() => remove(t)}><Icon name="trash" size={16} /></button>
                  </td>)}
                </tr>))}
                {shown.length === 0 && (<tr><td colSpan={isAdmin ? 5 : 4} className="muted" style={{ textAlign: 'center', padding: 28 }}>No {statusFilter} appointment types.</td></tr>)}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {modal && <TypeModal type={modal.type} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
    </>);
};

export default AppointmentTypes;
