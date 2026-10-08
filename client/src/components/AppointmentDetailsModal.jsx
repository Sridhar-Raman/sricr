import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cancelAppointment, STATUS_LABELS, updateAppointment } from '../api/appointments';
import { errorMessage } from '../api/client';
import Modal from './Modal';

const fmt = (date) => new Date(date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });

/** Event popup: details, status change (Completed only once the start time is reached), edit, cancel with reason. */
const AppointmentDetailsModal = ({ appointment, onClose, onEdit, onChanged, readOnly = false }) => {
    const [status, setStatus] = useState(appointment.status);
    const [cancelling, setCancelling] = useState(false);
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const started = new Date(appointment.startsAt).getTime() <= Date.now();
    const scheduled = appointment.status === 'scheduled';

    const run = async (action) => {
        setBusy(true);
        setError('');
        try { onChanged(await action()); }
        catch (err) { setError(errorMessage(err)); setBusy(false); }
    };

    const saveStatus = () => run(() => updateAppointment(appointment._id, { status }));
    const confirmCancel = (event) => {
        event.preventDefault();
        if (reason.trim().length < 2) { setError('Reason for cancellation is required (minimum 2 characters).'); return; }
        run(() => cancelAppointment(appointment._id, reason.trim()));
    };

    const type = appointment.appointmentType;
    return (<Modal title={cancelling ? 'Cancel Appointment' : 'Appointment'} onClose={onClose}>
      {error && <div className="alert" role="alert">{error}</div>}
      <div className="detail-head">
        <span className="dot" style={{ background: type?.color }} />
        <strong className="cap">{appointment.clientName}</strong>
        <span className={`pill pill-${appointment.status}`}>{STATUS_LABELS[appointment.status]}</span>
      </div>
      <dl className="details">
        <dt>Type</dt><dd>{type?.name}</dd>
        <dt>When</dt><dd>{fmt(appointment.startsAt)} – {new Date(appointment.endsAt).toLocaleTimeString([], { timeStyle: 'short' })}</dd>
        <dt>Meeting</dt><dd>{appointment.meetingMode === 'online' ? 'Online meeting' : 'One to one'}</dd>
        {appointment.meetingMode === 'online' && appointment.meetingUrl && (<><dt>Link</dt><dd><a href={appointment.meetingUrl} target="_blank" rel="noopener noreferrer">Join meeting</a></dd></>)}
        <dt>Assigned to</dt><dd>{appointment.assignedTo?.name || 'Unassigned'}</dd>
        {appointment.clientEmail && (<><dt>Email</dt><dd>{appointment.clientEmail}</dd></>)}
        {appointment.clientPhone && (<><dt>Phone</dt><dd>{appointment.clientPhone}</dd></>)}
        {appointment.notes && (<><dt>Notes</dt><dd className="pre">{appointment.notes}</dd></>)}
        {appointment.cancelReason && (<><dt>Cancel reason</dt><dd className="pre">{appointment.cancelReason}</dd></>)}
      </dl>

      {cancelling ? (
        <form className="stack" onSubmit={confirmCancel}>
          <label className="field">Reason for appointment cancellation <span className="req">*</span>
            <textarea rows={3} autoFocus maxLength={5000} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => { setCancelling(false); setError(''); }}>Back</button>
            <button type="submit" className="btn btn-danger" disabled={busy}>{busy ? 'Cancelling…' : 'Cancel appointment'}</button>
          </div>
        </form>
      ) : readOnly ? (
        <div className="modal-actions">
          <Link to="/app/my-appointments" className="btn btn-ghost" onClick={onClose}>Manage in My appointments</Link>
          <button type="button" className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      ) : scheduled && (
        <div className="stack">
          <label className="field">Visit status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="scheduled">Scheduled</option>
              <option value="completed" disabled={!started}>Completed{started ? '' : ' (after start time)'}</option>
              <option value="no-show" disabled={!started}>No show{started ? '' : ' (after start time)'}</option>
            </select>
          </label>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost danger" onClick={() => setCancelling(true)}>Cancel appointment</button>
            <button type="button" className="btn btn-ghost" onClick={() => onEdit(appointment)}>Edit / Reschedule</button>
            <button type="button" className="btn btn-primary" disabled={busy || status === appointment.status} onClick={saveStatus}>Save status</button>
          </div>
        </div>
      )}
    </Modal>);
};

export default AppointmentDetailsModal;
