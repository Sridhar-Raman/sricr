import { useCallback, useEffect, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchAppointments, fetchAssignees, STATUS_LABELS, updateAppointment } from '../api/appointments';
import api, { errorMessage } from '../api/client';
import AppointmentDetailsModal from '../components/AppointmentDetailsModal';
import AppointmentFormModal from '../components/AppointmentFormModal';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';

const VIEW_LABELS = { timeGridDay: 'Day', timeGridWeek: 'Week', dayGridMonth: 'Month', listDays: 'List' };
// Links (e.g. from the Dashboard cards) can open the calendar pre-filtered: ?view=day|week|month|list&date=YYYY-MM-DD&status=…&type=<id>&mine=1
const VIEW_ALIASES = { day: 'timeGridDay', week: 'timeGridWeek', month: 'dayGridMonth', list: 'listDays' };
const LINK_STATUSES = Object.keys(STATUS_LABELS);
const parseLink = (params) => {
    const date = params.get('date');
    const status = params.get('status');
    const type = params.get('type');
    return {
        view: VIEW_ALIASES[params.get('view')] || 'timeGridDay',
        date: /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? date : undefined,
        status: LINK_STATUSES.includes(status) ? status : '',
        type: /^[0-9a-f]{24}$/i.test(type || '') ? type : '',
        mine: params.get('mine') === '1',
    };
};
const INTERVALS = [
    { value: '00:15:00', label: '15 Mins' }, { value: '00:30:00', label: '30 Mins' },
    { value: '00:45:00', label: '45 Mins' }, { value: '01:00:00', label: '60 Mins' },
];
const NO_FILTERS = { appointmentType: '', status: '', assignedTo: '', interval: '00:15:00', mine: false };

const textColorOn = (hex = '#703a4b') => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? '#111827' : '#ffffff';
};

const sameDay = (a, b) => a.toDateString() === b.toDateString();

const MASKED_COLOR = '#c3cbe6';

/** `readOnly` (clients): nothing is draggable. Other people's bookings arrive masked as plain "Booked" blocks. */
const toEvent = (appointment, readOnly = false) => {
    const masked = !!appointment.masked;
    const color = masked ? MASKED_COLOR : (appointment.appointmentType?.color || '#703a4b');
    return {
        id: appointment._id,
        title: appointment.clientName,
        start: appointment.startsAt,
        end: appointment.endsAt,
        backgroundColor: color,
        borderColor: color,
        textColor: masked ? '#33426e' : textColorOn(color),
        // Only scheduled appointments can be dragged to a new time.
        startEditable: !readOnly && appointment.status === 'scheduled',
        classNames: [`appt-${appointment.status}`, ...(masked ? ['appt-masked'] : [])],
        extendedProps: { appointment },
    };
};

const renderEvent = (arg) => {
    const { appointment } = arg.event.extendedProps;
    if (appointment.masked) return <div className="cal-event"><div className="cal-event-title">Booked</div></div>;
    return (<div className="cal-event">
      <div className="cal-event-title">{appointment.clientName}</div>
      <div className="cal-event-sub">{appointment.appointmentType?.name}{appointment.assignedTo ? ` · ${appointment.assignedTo.name}` : ''}</div>
      {appointment.status !== 'scheduled' && <div className="cal-event-sub">{STATUS_LABELS[appointment.status]}</div>}
    </div>);
};

const Calendar = () => {
    const { isClient } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [initial] = useState(() => parseLink(searchParams)); // read once, when the page opens
    const calendarRef = useRef(null);
    const [types, setTypes] = useState([]);
    const [assignees, setAssignees] = useState([]);
    const startFilters = { ...NO_FILTERS, status: initial.status, appointmentType: initial.type, mine: isClient && initial.mine };
    const [filters, setFilters] = useState(startFilters);
    const [draft, setDraft] = useState(startFilters);
    const [filterOpen, setFilterOpen] = useState(false);
    const [viewType, setViewType] = useState(initial.view);
    const [viewTitle, setViewTitle] = useState('');
    const [isToday, setIsToday] = useState(true);
    const [formModal, setFormModal] = useState(null); // { appointment?, initialStart? }
    const [detail, setDetail] = useState(null);
    const [notice, setNotice] = useState(null); // { kind: 'error' | 'success', text }

    // The FullCalendar events callback is registered once; it reads the latest filters through this ref.
    const filtersRef = useRef(filters);
    filtersRef.current = filters;

    useEffect(() => {
        // Clients may read the types but not the staff list.
        Promise.all([api.get('/appointment-types'), isClient ? [] : fetchAssignees()])
            .then(([typeResponse, users]) => { setTypes(typeResponse.data.appointmentTypes); setAssignees(users); })
            .catch((error) => setNotice({ kind: 'error', text: errorMessage(error) }));
    }, [isClient]);

    const calendarApi = () => calendarRef.current?.getApi();
    const refetch = useCallback(() => calendarRef.current?.getApi().refetchEvents(), []);

    // Every filter feeds the events fetch, so changing one reloads the calendar (slot interval is a pure view option).
    useEffect(() => { refetch(); }, [filters.appointmentType, filters.status, filters.assignedTo, filters.mine, refetch]);

    const loadEvents = useCallback(async (info, success, failure) => {
        const { appointmentType, status, assignedTo, mine } = filtersRef.current;
        try {
            const params = { from: info.start.toISOString(), to: info.end.toISOString() };
            if (appointmentType) params.appointmentType = appointmentType;
            if (status) params.status = status;
            if (assignedTo && !isClient) params.assignedTo = assignedTo;
            const rows = await fetchAppointments(params);
            // "Mine only" (clients) drops the anonymous blocks that stand for other people's bookings.
            success(rows.filter((appointment) => !(mine && appointment.masked)).map((appointment) => toEvent(appointment, isClient)));
        }
        catch (error) {
            setNotice({ kind: 'error', text: errorMessage(error) });
            failure(error);
        }
    }, [isClient]);

    const onDatesSet = (arg) => {
        setViewTitle(arg.view.title);
        setViewType(arg.view.type);
        const now = new Date();
        setIsToday(arg.view.type === 'timeGridDay' ? sameDay(arg.view.currentStart, now) : now >= arg.start && now < arg.end);
    };

    // Past times can't be booked: a clicked/dragged slot opens the form pre-filled, nudged forward to "now" if needed.
    const onSelect = (selection) => {
        let start = selection.start;
        if (selection.view.type === 'dayGridMonth') start = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 9, 0);
        if (start < new Date()) start = new Date();
        setFormModal({ initialStart: start });
        calendarApi().unselect();
    };

    const onEventDrop = async (info) => {
        try {
            await updateAppointment(info.event.id, { startsAt: info.event.start.toISOString() });
            setNotice({ kind: 'success', text: 'Appointment rescheduled.' });
            refetch();
        }
        catch (error) {
            info.revert();
            setNotice({ kind: 'error', text: errorMessage(error) });
        }
    };

    const changeView = (type) => calendarApi().changeView(type);
    const applyFilters = () => {
        setFilters(draft);
        setFilterOpen(false);
    };
    const resetFilters = () => setDraft({ ...NO_FILTERS });
    const appliedCount = [filters.appointmentType, filters.status, filters.assignedTo, filters.mine, filters.interval !== NO_FILTERS.interval].filter(Boolean).length;

    // Chips that spell out what the calendar is currently narrowed to, with a one-click reset.
    const activeChips = [
        filters.status && STATUS_LABELS[filters.status],
        filters.appointmentType && (types.find((t) => t._id === filters.appointmentType)?.name || 'Selected type'),
        filters.assignedTo && `Assigned to ${assignees.find((u) => u._id === filters.assignedTo)?.name || 'selected user'}`,
        filters.mine && 'Only my appointments',
    ].filter(Boolean);
    const clearFilters = () => {
        const cleared = { ...filters, appointmentType: '', status: '', assignedTo: '', mine: false };
        setFilters(cleared);
        setDraft(cleared);
        if ([...searchParams.keys()].length) setSearchParams({}, { replace: true });
    };

    const afterChange = (message) => {
        setFormModal(null);
        setDetail(null);
        setNotice({ kind: 'success', text: message });
        refetch();
    };

    return (<>
      <PageHeader title="Calendar"
        subtitle={isClient ? 'Your appointments, and the times that are already booked. To book, use “Book an appointment”.'
            : 'Click or drag a free slot to book. Drag a scheduled appointment to reschedule it.'}>
        {isClient
          ? <Link to="/app/book" className="btn btn-primary"><Icon name="plus" size={16} />Book an appointment</Link>
          : <button type="button" className="btn btn-primary" onClick={() => setFormModal({})}><Icon name="plus" size={16} />New appointment</button>}
      </PageHeader>
      <div className="cal-toolbar">
        <div className="cal-toolbar-group">
          {!isToday && <button type="button" className="btn btn-ghost" onClick={() => calendarApi().today()}>Today</button>}
          <div className="cal-nav">
            <button type="button" className="icon-btn" aria-label="Previous" onClick={() => calendarApi().prev()}><Icon name="chevron-left" /></button>
            <span className="cal-title">{viewTitle}</span>
            <button type="button" className="icon-btn" aria-label="Next" onClick={() => calendarApi().next()}><Icon name="chevron-right" /></button>
          </div>
        </div>
        <div className="cal-toolbar-group">
          <div className="segmented" role="group" aria-label="Calendar view">
            {Object.entries(VIEW_LABELS).map(([type, label]) => (
              <button key={type} type="button" className={viewType === type ? 'active' : ''} aria-pressed={viewType === type} onClick={() => changeView(type)}>{label}</button>
            ))}
          </div>
          <div className="filter-wrap">
            <button type="button" className="btn btn-ghost" onClick={() => { setDraft(filters); setFilterOpen((open) => !open); }}>
              <Icon name="filter" size={16} />Filter{appliedCount > 0 && <span className="count-badge">{appliedCount}</span>}
            </button>
            {filterOpen && (<div className="card filter-panel">
              <label className="field">Appointment type
                <select value={draft.appointmentType} onChange={(e) => setDraft({ ...draft, appointmentType: e.target.value })}>
                  <option value="">All</option>
                  {types.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
                </select>
              </label>
              <label className="field">Visit status
                <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
                  <option value="">Active (hide cancelled)</option>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              {!isClient && (<label className="field">Assigned to
                <select value={draft.assignedTo} onChange={(e) => setDraft({ ...draft, assignedTo: e.target.value })}>
                  <option value="">Everyone</option>
                  {assignees.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
                </select>
              </label>)}
              {isClient && (<label className="field check">
                <input type="checkbox" checked={draft.mine} onChange={(e) => setDraft({ ...draft, mine: e.target.checked })} />Only my appointments
              </label>)}
              <label className="field">Slot interval
                <select value={draft.interval} onChange={(e) => setDraft({ ...draft, interval: e.target.value })}>
                  {INTERVALS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
                </select>
              </label>
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={resetFilters}>Reset</button>
                <button type="button" className="btn btn-primary" onClick={applyFilters}>Apply</button>
              </div>
            </div>)}
          </div>
        </div>
      </div>

      {activeChips.length > 0 && (<div className="filter-chips" aria-label="Active filters">
        <span className="muted">Showing:</span>
        {activeChips.map((chip) => <span key={chip} className="chip">{chip}</span>)}
        <button type="button" className="btn-text" onClick={clearFilters}>Clear filters</button>
      </div>)}

      {notice && (<div className={`alert${notice.kind === 'success' ? ' alert-ok' : ''}`} role="status">
        {notice.text}<button type="button" className="icon-btn" aria-label="Dismiss" onClick={() => setNotice(null)}><Icon name="x" size={15} /></button>
      </div>)}

      {types.length > 0 && (<div className="legend">
        {types.filter((t) => t.active).map((t) => (<span key={t._id}><span className="dot" style={{ background: t.color }} />{t.name}</span>))}
      </div>)}

      <div className="card cal-card">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          headerToolbar={false}
          initialView={initial.view}
          initialDate={initial.date}
          views={{ listDays: { type: 'list', duration: { days: 60 }, buttonText: 'List' } }}
          noEventsContent="No appointments in this period."
          height="100%"
          nowIndicator
          scrollTimeReset={false}
          slotDuration={filters.interval}
          slotLabelInterval="01:00:00"
          slotMinTime="07:00:00"
          slotMaxTime="20:00:00"
          allDaySlot={false}
          editable={!isClient}
          eventDurationEditable={false}
          selectable={!isClient}
          selectMirror={false}
          selectAllow={(span) => span.end > new Date()}
          eventAllow={(drop) => drop.start >= new Date(Date.now() - 60000)}
          navLinks
          dayMaxEvents
          fixedWeekCount={false}
          showNonCurrentDates={false}
          slotEventOverlap
          eventMaxStack={5}
          lazyFetching={false}
          slotLabelFormat={{ hour: 'numeric', meridiem: 'short' }}
          events={loadEvents}
          eventContent={renderEvent}
          // Other people's bookings are anonymous blocks: nothing to open.
          eventClick={(info) => { const appointment = info.event.extendedProps.appointment; if (!appointment.masked) setDetail(appointment); }}
          select={onSelect}
          eventDrop={onEventDrop}
          datesSet={onDatesSet}
        />
      </div>

      {formModal && (<AppointmentFormModal appointment={formModal.appointment} initialStart={formModal.initialStart}
        types={types} assignees={assignees} onClose={() => setFormModal(null)}
        onSaved={() => afterChange(formModal.appointment ? 'Appointment updated.' : 'Appointment booked.')} />)}
      {detail && !formModal && (<AppointmentDetailsModal appointment={detail} readOnly={isClient} onClose={() => setDetail(null)}
        onEdit={(appointment) => setFormModal({ appointment })}
        onChanged={(updated) => afterChange(updated.status === 'cancelled' ? 'Appointment cancelled.' : 'Appointment updated.')} />)}
    </>);
};

export default Calendar;
