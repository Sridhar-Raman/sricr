/**
 * Donut chart with a legend. segments: [{ label, value, color }]. The centre shows the total.
 */
const DonutChart = ({ segments, size = 168, thickness = 22, centerLabel = 'Total', empty = 'No data yet' }) => {
    const total = segments.reduce((sum, s) => sum + s.value, 0);
    const r = (size - thickness) / 2;
    const c = 2 * Math.PI * r;
    const gap = segments.filter((s) => s.value > 0).length > 1 ? 3 : 0;
    let offset = 0;

    return (<div className="donut">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
        aria-label={total ? segments.map((s) => `${s.label}: ${s.value}`).join(', ') : empty}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" className="donut-track" strokeWidth={thickness} />
        {total > 0 && segments.map((s) => {
            if (!s.value) return null;
            const len = (s.value / total) * c;
            const dash = Math.max(0, len - gap);
            const node = (<circle key={s.label} className="donut-seg" cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color}
              strokeWidth={thickness} strokeLinecap="butt" strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}><title>{`${s.label}: ${s.value}`}</title></circle>);
            offset += len;
            return node;
        })}
        <text x="50%" y="48%" textAnchor="middle" className="donut-total">{total}</text>
        <text x="50%" y="48%" dy="1.5em" textAnchor="middle" className="axis-text">{total ? centerLabel : empty}</text>
      </svg>
      <ul className="legend-list">
        {segments.map((s) => (<li key={s.label}>
          <span className="dot" style={{ background: s.color }} />
          <span className="legend-name">{s.label}</span>
          <b>{s.value}</b>
          <small>{total ? `${Math.round((s.value / total) * 100)}%` : '–'}</small>
        </li>))}
      </ul>
    </div>);
};

export default DonutChart;
