import { useCallback, useEffect, useState } from 'react';
import Icon from '../../components/Icon';

/* Mini interface mock-ups (pure markup) shown as gallery "screens". */
const Pill = ({ children, active }) => <span className={`mk-pill${active ? ' on' : ''}`}>{children}</span>;

const MockServices = () => (
  <div className="mk">
    <div className="mk-title">Choose a service</div>
    {[['Initial consultation', '45 min'], ['Follow-up visit', '30 min'], ['Quick check-in', '15 min']].map(([name, time], i) => (
      <div key={name} className={`mk-row${i === 0 ? ' on' : ''}`}><span><b>{name}</b></span><small>{time}</small></div>
    ))}
  </div>
);

const MockSlots = () => (
  <div className="mk">
    <div className="mk-title">Pick a time</div>
    <div className="mk-days">{['Mon 6', 'Tue 7', 'Wed 8', 'Thu 9'].map((d, i) => <Pill key={d} active={i === 1}>{d}</Pill>)}</div>
    <div className="mk-slots">{['9:00', '9:30', '10:00', '10:30', '11:00', '11:30', '1:00', '1:30'].map((t, i) => <Pill key={t} active={i === 2}>{t}</Pill>)}</div>
  </div>
);

const MockConfirm = () => (
  <div className="mk mk-center">
    <span className="mk-tick"><Icon name="check" size={26} strokeWidth={3} /></span>
    <div className="mk-title">Booking confirmed</div>
    <small>Tue 7 Oct · 10:00 AM</small>
  </div>
);

const MockCalendar = () => (
  <div className="mk">
    <div className="mk-title">October</div>
    <div className="mk-month">
      {Array.from({ length: 28 }, (_, i) => <span key={i} className={[3, 9, 10, 17, 22].includes(i) ? 'dot' : ''}>{i + 1}</span>)}
    </div>
  </div>
);

const MockReschedule = () => (
  <div className="mk mk-center">
    <div className="mk-move"><Pill>Tue 10:00</Pill><Icon name="arrow-right" size={18} /><Pill active>Thu 2:30</Pill></div>
    <div className="mk-title">Moved in one tap</div>
    <small>Pick any free time</small>
  </div>
);

const MockTeam = () => (
  <div className="mk">
    <div className="mk-title">Today</div>
    <div className="mk-stats"><div><b>12</b><small>Booked</small></div><div><b>3</b><small>Open</small></div></div>
    {[80, 55, 90].map((w, i) => <div key={i} className="mk-bar"><i style={{ width: `${w}%` }} /></div>)}
  </div>
);

const ITEMS = [
    { title: 'Choose a service', caption: 'Clear services with their length shown up front.', Mock: MockServices },
    { title: 'Pick a time', caption: 'Only genuinely free times are offered.', Mock: MockSlots },
    { title: 'Instant confirmation', caption: 'Your booking is saved the moment you confirm.', Mock: MockConfirm },
    { title: 'Team calendar', caption: 'Staff see the whole month at a glance.', Mock: MockCalendar },
    { title: 'Easy rescheduling', caption: 'Plans change — moving a booking is simple.', Mock: MockReschedule },
    { title: 'Daily overview', caption: 'Know what is booked and what is still open.', Mock: MockTeam },
];

const Gallery = () => {
    const [index, setIndex] = useState(null);
    const close = useCallback(() => setIndex(null), []);
    const step = useCallback((delta) => setIndex((current) => (current === null ? null : (current + delta + ITEMS.length) % ITEMS.length)), []);

    useEffect(() => {
        if (index === null) return undefined;
        const onKey = (event) => {
            if (event.key === 'Escape') close();
            if (event.key === 'ArrowRight') step(1);
            if (event.key === 'ArrowLeft') step(-1);
        };
        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
    }, [index, close, step]);

    const current = index === null ? null : ITEMS[index];

    return (<>
      <section className="page-hero">
        <span className="eyebrow">Gallery</span>
        <h1>A look inside</h1>
        <p>A quick tour of the screens clients and teams use every day.</p>
      </section>
      <section className="section">
        <div className="gallery-grid">
          {ITEMS.map((item, i) => (
            <button key={item.title} type="button" className="gallery-tile" onClick={() => setIndex(i)} aria-label={`Open ${item.title}`}>
              <div className="gallery-shot"><item.Mock /></div>
              <div className="gallery-cap"><strong>{item.title}</strong><span>{item.caption}</span></div>
            </button>
          ))}
        </div>
      </section>

      {current && (<div className="lightbox" role="dialog" aria-modal="true" aria-label={current.title} onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
        <button type="button" className="lb-btn lb-close" onClick={close} aria-label="Close"><Icon name="x" size={22} /></button>
        <button type="button" className="lb-btn lb-prev" onClick={() => step(-1)} aria-label="Previous"><Icon name="chevron-left" size={26} /></button>
        <figure className="lb-card">
          <div className="gallery-shot big"><current.Mock /></div>
          <figcaption><strong>{current.title}</strong><span>{current.caption}</span></figcaption>
        </figure>
        <button type="button" className="lb-btn lb-next" onClick={() => step(1)} aria-label="Next"><Icon name="chevron-right" size={26} /></button>
      </div>)}
    </>);
};

export default Gallery;
