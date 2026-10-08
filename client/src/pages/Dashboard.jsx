import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { STATUS_LABELS } from '../api/appointments';
import api, { errorMessage } from '../api/client';
import BarChart from '../components/charts/BarChart';
import DonutChart from '../components/charts/DonutChart';
import HBars from '../components/charts/HBars';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';
import PageHeader from '../components/PageHeader';
import { useAuth } from '../context/AuthContext';

const STATUS_TONES = { scheduled: '#703a4b', completed: '#4f8a5e', 'no-show': '#c08a3e', cancelled: '#b3261e' };

/** A figure card. With `to` it is a link that opens the matching screen already filtered. */
const Stat = ({ icon, tone, label, value, to, hint }) => {
    const body = (<>
      <span className={`stat-icon tone-${tone}`}><Icon name={icon} size={22} /></span>
      <div><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>
      {to && <Icon name="arrow-right" size={18} className="stat-arrow" />}
    </>);
    return to
      ? <Link to={to} className="card stat stat-link" title={hint} aria-label={`${label}: ${value}. ${hint}`}>{body}</Link>
      : <div className="card stat">{body}</div>;
};

const greeting = () => {
    const hour = new Date().getHours();
    return hour < 12 ? 'Good morning' : (hour < 18 ? 'Good afternoon' : 'Good evening');
};

const utcDate = (date) => new Date(`${date}T00:00:00Z`);
const hourLabel = (hour) => `${hour % 12 || 12}${hour < 12 ? 'a' : 'p'}`;

const ChartCard = ({ title, hint, children, footer }) => (
  <section className="card chart-card">
    <div className="card-head"><h2>{title}</h2>{hint && <span className="muted">{hint}</span>}</div>
    <div className="chart-body">{children}</div>
    {footer}
  </section>
);

const Dashboard = () => {
    const { user, isAdmin, isClient } = useAuth();
    const [summary, setSummary] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get('/dashboard/summary').then((r) => setSummary(r.data)).catch((e) => setError(errorMessage(e)));
    }, []);

    const today = new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    const mine = isClient ? 'Your ' : '';

    // Calendar links carry the filter: dates come from the server (business time zone), so "today" matches the figures.
    const dayOf = (offset) => summary?.daily.find((d) => d.offset === offset)?.date;
    const own = isClient ? '&mine=1' : '';
    const todayLink = `/app/calendar?view=day&date=${dayOf(0)}${own}`;
    const upcomingLink = `/app/calendar?view=list&date=${dayOf(1)}&status=scheduled${own}`;
    const typesLink = '/app/appointment-types?status=active';

    const charts = useMemo(() => {
        if (!summary) return null;
        const daily = summary.daily.map((d) => {
            const date = utcDate(d.date);
            const weekday = date.toLocaleDateString([], { weekday: 'short', timeZone: 'UTC' });
            const dayNumber = date.toLocaleDateString([], { day: 'numeric', timeZone: 'UTC' });
            const nice = date.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' });
            return {
                label: `${weekday} ${dayNumber}`, short: dayNumber, value: d.count, strong: d.offset === 0,
                color: d.offset < 0 ? 'var(--chart-past)' : (d.offset === 0 ? 'var(--primary)' : 'var(--chart-future)'),
                tip: `${nice}${d.offset === 0 ? ' (today)' : ''}: ${d.count} booking${d.count === 1 ? '' : 's'}`,
            };
        });
        const peak = Math.max(0, ...summary.hours.map((h) => h.count));
        const hours = summary.hours.map((h) => ({
            label: hourLabel(h.hour), value: h.count, color: peak > 0 && h.count === peak ? 'var(--primary)' : 'var(--chart-future)',
            tip: `${hourLabel(h.hour)}: ${h.count} booking${h.count === 1 ? '' : 's'}`,
        }));
        const peakHour = summary.hours.find((h) => h.count === peak && peak > 0);
        const statusSegments = Object.entries(STATUS_LABELS).map(([key, label]) => ({ label, value: summary.byStatus[key] || 0, color: STATUS_TONES[key] }));
        const types = summary.byType.map((t) => ({ label: t.name, value: t.count, color: t.color || 'var(--primary)' }));
        return { daily, hours, peakHour, statusSegments, types, dailyTotal: daily.reduce((sum, d) => sum + d.value, 0) };
    }, [summary]);

    return (<>
      <PageHeader title={`${greeting()}, ${user.name.split(' ')[0]}`} subtitle={today}>
        <Link to="/app/calendar" className="btn btn-primary"><Icon name="calendar" size={16} />Open calendar</Link>
      </PageHeader>
      {error && <div className="alert" role="alert">{error}</div>}

      {!summary && !error && (<div className="stats">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 82 }} />)}</div>)}

      {summary && charts && (<>
        <div className="stats">
          <Stat icon="calendar-check" tone="maroon" label={`${mine}appointments today`} value={summary.today} to={todayLink} hint="Open today in the calendar" />
          <Stat icon="clock" tone="amber" label={isClient ? 'Your upcoming' : 'Upcoming'} value={summary.upcoming} to={upcomingLink} hint="Open the scheduled appointments from tomorrow in the calendar" />
          <Stat icon="tag" tone="green" label="Active appointment types" value={summary.activeAppointmentTypes} to={typesLink} hint="See the active appointment types" />
          {isAdmin && <Stat icon="users" tone="rose" label="Active users" value={summary.activeUsers} />}
        </div>

        <div className="grid-2">
          <ChartCard title={isClient ? 'Your bookings by day' : 'Bookings by day'} hint={`${charts.dailyTotal} in this 2-week window`}
            footer={(<div className="chart-legend">
              <span><i style={{ background: 'var(--chart-past)' }} />Past</span>
              <span><i style={{ background: 'var(--primary)' }} />Today</span>
              <span><i style={{ background: 'var(--chart-future)' }} />Upcoming</span>
            </div>)}>
            <BarChart data={charts.daily} height={240} ariaLabel="Bookings per day, six days back to seven days ahead" empty="No bookings in this window yet." />
          </ChartCard>

          <ChartCard title={isClient ? 'Your bookings by status' : 'Bookings by status'} hint="All time">
            <DonutChart segments={charts.statusSegments} centerLabel="bookings" empty="No bookings yet" />
          </ChartCard>
        </div>

        <div className="grid-even">
          <ChartCard title="By appointment type" hint="Top 6, all time">
            <HBars items={charts.types} empty="No bookings yet." />
          </ChartCard>

          <ChartCard title="Busiest hours" hint={charts.peakHour ? `Peak: ${hourLabel(charts.peakHour.hour)} · ${summary.timezone.replace('_', ' ')}` : summary.timezone.replace('_', ' ')}>
            <BarChart data={charts.hours} height={210} ariaLabel="Bookings by hour of the day" empty="No bookings yet." />
          </ChartCard>
        </div>

        <section className="card">
          <div className="card-head"><h2>{isClient ? 'Your next appointments' : 'Next appointments'}</h2><Link to="/app/calendar" className="btn-text">View calendar</Link></div>
          {summary.nextAppointments.length === 0 ? (
            <EmptyState icon="calendar" title="Nothing scheduled">
              <p>Upcoming appointments will appear here.</p>
            </EmptyState>
          ) : (
            <ul className="list">
              {summary.nextAppointments.map((a) => {
                  const start = new Date(a.startsAt);
                  return (<li key={a._id} className="list-row">
                    <div className="date-chip"><span>{start.toLocaleDateString([], { month: 'short' })}</span><b>{start.getDate()}</b></div>
                    <div className="list-main">
                      <strong>{a.clientName}</strong>
                      <small>{start.toLocaleTimeString([], { timeStyle: 'short' })}</small>
                    </div>
                    <span className="badge" style={{ background: `${a.appointmentType?.color}22`, color: 'var(--text)' }}>
                      <span className="dot" style={{ background: a.appointmentType?.color }} />{a.appointmentType?.name}
                    </span>
                  </li>);
              })}
            </ul>
          )}
        </section>
      </>)}
    </>);
};

export default Dashboard;
