import { useEffect, useMemo, useRef, useState } from 'react';
import { errorMessage } from '../../api/client';
import { addDays, dayLabel, fetchAvailability, formatSlot, todayIn, usePortalConfig, weekdayOf } from '../../api/portal';

const DAYS_SHOWN = 14;

/**
 * Pick a day (next open days in the business time zone) and then a free start time.
 * `value` is the chosen slot's ISO string; `excludeId` lets a reschedule ignore the appointment being moved.
 */
const SlotPicker = ({ typeId, value, onChange, excludeId = null }) => {
    const config = usePortalConfig();
    const [date, setDate] = useState('');
    const [slots, setSlots] = useState(null); // null = loading
    const [error, setError] = useState('');
    const picked = useRef(false); // once the user chooses a day we stop auto-advancing

    const days = useMemo(() => {
        if (!config) return [];
        const today = todayIn(config.timezone);
        const list = [];
        for (let i = 0; list.length < DAYS_SHOWN && i <= config.maxDaysAhead; i += 1) {
            const day = addDays(today, i);
            if (config.openDays.includes(weekdayOf(day))) list.push(day);
        }
        return list;
    }, [config]);

    // Start on the first open day.
    useEffect(() => { if (!date && days.length) setDate(days[0]); }, [days, date]);

    useEffect(() => {
        if (!date || !typeId) return undefined;
        let alive = true;
        setSlots(null);
        setError('');
        fetchAvailability({ date, type: typeId, ...(excludeId ? { excludeId } : {}) })
            .then((result) => {
                if (!alive) return;
                setSlots(result.slots);
                // Until the user picks a day, skip ahead to the first day that actually has times.
                const next = days[days.indexOf(date) + 1];
                if (result.slots.length === 0 && !picked.current && next) setDate(next);
            })
            .catch((err) => { if (alive) { setSlots([]); setError(errorMessage(err)); } });
        return () => { alive = false; };
    }, [date, typeId, excludeId, days]);

    // A previously chosen slot is dropped when the day or service changes.
    useEffect(() => { onChange(''); }, [date, typeId]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!config) return <div className="skeleton" style={{ height: 120 }} />;

    return (<div className="slot-picker">
      <div className="day-strip" role="listbox" aria-label="Choose a day">
        {days.map((day) => (
          <button key={day} type="button" role="option" aria-selected={day === date} className={`day-chip${day === date ? ' on' : ''}`} onClick={() => { picked.current = true; setDate(day); }}>
            <small>{dayLabel(day, { weekday: 'short' })}</small>
            <b>{dayLabel(day, { day: 'numeric' })}</b>
            <small>{dayLabel(day, { month: 'short' })}</small>
          </button>
        ))}
      </div>

      {error && <div className="alert" role="alert">{error}</div>}
      {slots === null && <div className="skeleton" style={{ height: 96 }} />}
      {slots && slots.length === 0 && !error && <p className="muted slot-empty">No times are available on this day. Try another day.</p>}
      {slots && slots.length > 0 && (<div className="slot-grid" role="listbox" aria-label="Choose a time">
        {slots.map((slot) => (
          <button key={slot} type="button" role="option" aria-selected={slot === value} className={`slot${slot === value ? ' on' : ''}`} onClick={() => onChange(slot)}>
            {formatSlot(slot, config.timezone)}
          </button>
        ))}
      </div>)}
      <p className="muted slot-tz">Times shown in {config.timezone.replace('_', ' ')}.</p>
    </div>);
};

export default SlotPicker;
