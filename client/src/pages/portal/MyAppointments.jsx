import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { STATUS_LABELS } from '../../api/appointments';
import { errorMessage } from '../../api/client';
import {
    cancelMyAppointment, fetchMyAppointments, formatDateTime, rescheduleAppointment, usePortalConfig,
} from '../../api/portal';
import EmptyState from '../../components/EmptyState';
import Icon from '../../components/Icon';
import Modal from '../../components/Modal';
import PageHeader from '../../components/PageHeader';
import SlotPicker from '../../components/portal/SlotPicker';

const RescheduleModal = ({ appointment, onClose, onDone }) => {
    const config = usePortalConfig();
    const [slot, setSlot] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const save = async () => {
        setBusy(true);
        setError('');
        try { await rescheduleAppointment(appointment._id, slot); onDone('Appointment rescheduled.'); }
        catch (err) { setError(errorMessage(err)); setSlot(''); setBusy(false); }
    };

    return (<Modal title="Reschedule appointment" onClose={onClose} width={640}>
      <div className="stack">
        <p className="muted">{appointment.appointmentType?.name} · currently {config && formatDateTime(appointment.startsAt, config.timezone)}</p>
        {error && <div className="alert" role="alert">{error}</div>}
        <SlotPicker typeId={appointment.appointmentType?._id} excludeId={appointment._id} value={slot} onChange={setSlot} />
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Keep current time</button>
          <button type="button" className="btn btn-primary" disabled={!slot || busy} onClick={save}>{busy ? 'Saving…' : 'Confirm new time'}</button>
        </div>
      </div>
    </Modal>);
};

const CancelModal = ({ appointment, onClose, onDone }) => {
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const cancel = async () => {
        setBusy(true);
        setError('');
        try { await cancelMyAppointment(appointment._id, reason); onDone('Appointment cancelled.'); }
        catch (err) { setError(errorMessage(err)); setBusy(false); }
    };

    return (<Modal title="Cancel appointment" onClose={onClose} width={460}>
      <div className="stack">
        <p>Cancel your <strong>{appointment.appointmentType?.name}</strong> appointment? This frees the time for others.</p>
        {error && <div className="alert" role="alert">{error}</div>}
        <label className="field"><span>Reason <small>(optional)</small></span><textarea rows={3} maxLength={1000} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Keep appointment</button>
          <button type="button" className="btn btn-danger" disabled={busy} onClick={cancel}>{busy ? 'Cancelling…' : 'Cancel appointment'}</button>
        </div>
      </div>
    </Modal>);
};

const MyAppointments = () => {
    const config = usePortalConfig();
    const [appointments, setAppointments] = useState(null);
    const [tab, setTab] = useState('upcoming');
    const [modal, setModal] = useState(null); // { kind, appointment }
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');

    const load = useCallback(() => fetchMyAppointments().then(setAppointments).catch((err) => { setAppointments([]); setError(errorMessage(err)); }), []);
    useEffect(() => { load(); }, [load]);

    const now = Date.now();
    const upcoming = (appointments || []).filter((a) => a.status === 'scheduled' && new Date(a.endsAt).getTime() >= now).reverse();
    const past = (appointments || []).filter((a) => !upcoming.includes(a));
    const list = tab === 'upcoming' ? upcoming : past;

    const done = (message) => { setModal(null); setNotice(message); load(); };

    return (<>
      <PageHeader title="My appointments" subtitle="Everything you have booked, in one place.">
        <Link to="/app/book" className="btn btn-primary"><Icon name="plus" size={16} />Book an appointment</Link>
      </PageHeader>
      {error && <div className="alert" role="alert">{error}</div>}
      {notice && <div className="alert alert-ok" role="status">{notice}</div>}

      <div className="segmented tabs" role="tablist">
        {[['upcoming', `Upcoming (${upcoming.length})`], ['past', `Past & cancelled (${past.length})`]].map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>

      <div className="card portal-card flush">
        {appointments === null ? <div className="skeleton" style={{ height: 160 }} /> : list.length === 0 ? (
          <EmptyState icon="calendar" title={tab === 'upcoming' ? 'No upcoming appointments' : 'Nothing here yet'}>
            {tab === 'upcoming' && <p>Ready when you are — <Link to="/app/book">book your first appointment</Link>.</p>}
          </EmptyState>
        ) : (
          <ul className="list">
            {list.map((a) => {
                const start = new Date(a.startsAt);
                const canChange = a.status === 'scheduled' && start.getTime() > now;
                return (<li key={a._id} className="list-row appt-row">
                  <div className="date-chip"><span>{start.toLocaleDateString([], { month: 'short', timeZone: config?.timezone })}</span><b>{start.toLocaleDateString([], { day: 'numeric', timeZone: config?.timezone })}</b></div>
                  <div className="list-main">
                    <strong>{a.appointmentType?.name}</strong>
                    <small>{config && formatDateTime(a.startsAt, config.timezone)} · {a.appointmentType?.durationMinutes} min · {a.meetingMode === 'online' ? 'Online meeting' : 'One to one'}</small>
                  </div>
                  <span className={`pill pill-${a.status}`}>{STATUS_LABELS[a.status]}</span>
                  {canChange && (<div className="row-actions">
                    {a.meetingMode === 'online' && a.meetingUrl && <a className="btn btn-primary btn-sm" href={a.meetingUrl} target="_blank" rel="noopener noreferrer">Join meeting</a>}
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModal({ kind: 'reschedule', appointment: a })}>Reschedule</button>
                    <button type="button" className="btn btn-ghost btn-sm danger" onClick={() => setModal({ kind: 'cancel', appointment: a })}>Cancel</button>
                  </div>)}
                </li>);
            })}
          </ul>
        )}
      </div>

      {modal?.kind === 'reschedule' && <RescheduleModal appointment={modal.appointment} onClose={() => setModal(null)} onDone={done} />}
      {modal?.kind === 'cancel' && <CancelModal appointment={modal.appointment} onClose={() => setModal(null)} onDone={done} />}
    </>);
};

export default MyAppointments;
