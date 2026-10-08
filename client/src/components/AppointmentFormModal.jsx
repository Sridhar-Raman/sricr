import { useState } from 'react';
import { createAppointment, updateAppointment } from '../api/appointments';
import { errorMessage } from '../api/client';
import { maskPhone, US_PHONE_HINT, US_PHONE_PATTERN } from '../utils/phone';
import Modal from './Modal';

/** Local "YYYY-MM-DDTHH:mm" for a datetime-local input. */
export const toLocalInput = (date) => {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
};

/**
 * Create (no `appointment`) or reschedule/edit a scheduled appointment.
 * `initialStart` pre-fills the time when a calendar slot was clicked.
 */
const AppointmentFormModal = ({ appointment, initialStart, types, assignees, onClose, onSaved }) => {
    const editing = !!appointment;
    const activeTypes = types.filter((t) => t.active || t._id === appointment?.appointmentType?._id);
    const [form, setForm] = useState(() => ({
        appointmentType: appointment?.appointmentType?._id || activeTypes[0]?._id || '',
        clientName: appointment?.clientName || '',
        clientEmail: appointment?.clientEmail || '',
        clientPhone: appointment?.clientPhone || '',
        assignedTo: appointment?.assignedTo?._id || '',
        startsAt: toLocalInput(appointment?.startsAt || initialStart || new Date()),
        notes: appointment?.notes || '',
        meetingMode: appointment?.meetingMode || 'one-to-one',
        meetingUrl: appointment?.meetingUrl || '',
    }));
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });
    const type = types.find((t) => t._id === form.appointmentType);

    const submit = async (event) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        const body = { ...form, startsAt: new Date(form.startsAt).toISOString() };
        try {
            const saved = editing ? await updateAppointment(appointment._id, body) : await createAppointment(body);
            onSaved(saved);
        }
        catch (err) { setError(errorMessage(err)); setBusy(false); }
    };

    const footer = (<>
      <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
      <button type="submit" form="appointment-form" className="btn btn-primary" disabled={busy || !form.appointmentType}>
        {busy ? 'Saving…' : (editing ? 'Save changes' : 'Book appointment')}
      </button>
    </>);

    return (<Modal title={editing ? 'Edit Appointment' : 'New Appointment'} onClose={onClose} footer={footer}>
      <form id="appointment-form" className="stack" onSubmit={submit}>
        {error && <div className="alert" role="alert">{error}</div>}
        <label className="field">Appointment type
          <select required value={form.appointmentType} onChange={set('appointmentType')}>
            {activeTypes.length === 0 && <option value="">No active types — add one first</option>}
            {activeTypes.map((t) => <option key={t._id} value={t._id}>{t.name} ({t.durationMinutes} min)</option>)}
          </select>
        </label>
        <label className="field">Date &amp; time
          <input type="datetime-local" required value={form.startsAt} onChange={set('startsAt')} />
          {type && <small>Runs {type.durationMinutes} min{type.bufferMinutes ? ` + ${type.bufferMinutes} min buffer` : ''}.</small>}
        </label>
        <label className="field">Client name<input required maxLength={120} value={form.clientName} onChange={set('clientName')} /></label>
        <div className="two-col">
          <label className="field">Email<input type="email" value={form.clientEmail} onChange={set('clientEmail')} /></label>
          <label className="field">Phone<input type="tel" inputMode="tel" autoComplete="tel" maxLength={14} placeholder="(555) 123-4567" pattern={US_PHONE_PATTERN} title={US_PHONE_HINT}
            value={form.clientPhone} onChange={(e) => setForm({ ...form, clientPhone: maskPhone(e.target.value, form.clientPhone) })} /></label>
        </div>
        <label className="field">Assigned to
          <select value={form.assignedTo} onChange={set('assignedTo')}>
            <option value="">Unassigned</option>
            {assignees.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
        </label>
        <label className="field">Meeting
          <select value={form.meetingMode} onChange={set('meetingMode')}>
            <option value="one-to-one">One to one</option>
            <option value="online">Online meeting</option>
          </select>
        </label>
        {form.meetingMode === 'online' && (<label className="field"><span>Meeting link <small>(optional)</small></span>
          <input type="url" maxLength={500} placeholder="https://… leave empty to create one automatically" value={form.meetingUrl} onChange={set('meetingUrl')} />
        </label>)}
        <label className="field">Notes<textarea rows={3} maxLength={2000} value={form.notes} onChange={set('notes')} /></label>
      </form>
    </Modal>);
};

export default AppointmentFormModal;
