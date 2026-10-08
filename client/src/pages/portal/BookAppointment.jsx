import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { errorMessage } from '../../api/client';
import { bookAppointment, fetchPortalTypes, formatDateTime, usePortalConfig } from '../../api/portal';
import Icon from '../../components/Icon';
import PageHeader from '../../components/PageHeader';
import SlotPicker from '../../components/portal/SlotPicker';

const BookAppointment = () => {
    const config = usePortalConfig();
    const [types, setTypes] = useState(null);
    const [typeId, setTypeId] = useState('');
    const [slot, setSlot] = useState('');
    const [notes, setNotes] = useState('');
    const [mode, setMode] = useState('one-to-one');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [done, setDone] = useState(null);

    useEffect(() => {
        fetchPortalTypes().then(setTypes).catch((err) => { setTypes([]); setError(errorMessage(err)); });
    }, []);

    const type = types?.find((t) => t._id === typeId);

    const confirm = async () => {
        setBusy(true);
        setError('');
        try { setDone(await bookAppointment({ appointmentType: typeId, startsAt: slot, notes, meetingMode: mode })); }
        catch (err) { setError(errorMessage(err)); setSlot(''); setBusy(false); }
    };

    if (done) {
        return (<div className="card portal-card success-card">
          <span className="success-tick"><Icon name="check" size={30} strokeWidth={3} /></span>
          <h1>You’re booked!</h1>
          <p><strong>{done.appointmentType?.name}</strong><br />{config && formatDateTime(done.startsAt, config.timezone)}</p>
          <p className="muted">{done.meetingMode === 'online' ? 'This is an online meeting. Use the button below at the start time (a link is also in your email).' : 'This is a one-to-one appointment.'}</p>
          <div className="row-actions center">
            {done.meetingMode === 'online' && <a className="btn btn-primary" href={done.meetingUrl} target="_blank" rel="noopener noreferrer">Join meeting</a>}
            <Link to="/app/my-appointments" className="btn btn-primary">View my appointments</Link>
            <button type="button" className="btn btn-ghost" onClick={() => { setDone(null); setBusy(false); setTypeId(''); setSlot(''); setNotes(''); setMode('one-to-one'); }}>Book another</button>
          </div>
        </div>);
    }

    return (<>
      <PageHeader title="Book an appointment" subtitle="Choose a service, then a day and time that suits you." />
      {error && <div className="alert" role="alert">{error}</div>}

      <section className="card portal-card">
        <h2><span className="num">1</span>Choose a service</h2>
        {types === null && <div className="skeleton" style={{ height: 100 }} />}
        {types && types.length === 0 && <p className="muted">No services are available to book right now. Please check back soon.</p>}
        <div className="type-grid">
          {types?.map((t) => (
            <button key={t._id} type="button" className={`type-card${t._id === typeId ? ' on' : ''}`} aria-pressed={t._id === typeId} onClick={() => setTypeId(t._id)}>
              <span className="type-bar" style={{ background: t.color }} />
              <strong>{t.name}</strong>
              {t.description && <span className="muted">{t.description}</span>}
              <small><Icon name="clock" size={14} />{t.durationMinutes} min</small>
            </button>
          ))}
        </div>
      </section>

      {typeId && (<section className="card portal-card">
        <h2><span className="num">2</span>Pick a day and time</h2>
        <SlotPicker typeId={typeId} value={slot} onChange={setSlot} />
      </section>)}

      {slot && (<section className="card portal-card">
        <h2><span className="num">3</span>Confirm</h2>
        <p className="summary"><strong>{type?.name}</strong> · {type?.durationMinutes} min<br />{config && formatDateTime(slot, config.timezone)}</p>
        <fieldset className="mode-picker">
          <legend>How would you like to meet?</legend>
          {[['one-to-one', 'One to one', 'Meet with us directly'], ['online', 'Online meeting', 'Join by video link']].map(([value, title, hint]) => (
            <label key={value} className={`mode-option${mode === value ? ' on' : ''}`}>
              <input type="radio" name="meetingMode" value={value} checked={mode === value} onChange={() => setMode(value)} />
              <strong>{title}</strong><small>{hint}</small>
            </label>
          ))}
        </fieldset>
        <label className="field"><span>Anything we should know? <small>(optional)</small></span>
          <textarea rows={3} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <div className="modal-actions">
          <button type="button" className="btn btn-primary" disabled={busy} onClick={confirm}>{busy ? 'Booking…' : 'Confirm booking'}</button>
        </div>
      </section>)}
    </>);
};

export default BookAppointment;
