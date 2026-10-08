import useWidth from './useWidth';

/** A tidy integer step for the y axis (1, 2, 5, 10, 20, 50 …) giving about four gridlines. */
const niceStep = (max) => {
    const raw = Math.max(1, max / 4);
    const pow = 10 ** Math.floor(Math.log10(raw));
    const scaled = raw / pow;
    const step = (scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10) * pow;
    return Math.max(1, Math.round(step));
};

/**
 * Vertical bar chart. data: [{ label, value, color?, strong?, tip? }]
 * `strong` bolds that bar's axis label (e.g. today). Bars grow in on mount.
 */
const BarChart = ({ data, height = 230, ariaLabel, empty = 'Nothing to show yet.' }) => {
    const [ref, width] = useWidth();
    const padL = 30, padR = 6, padT = 18, padB = 30;
    const max = Math.max(0, ...data.map((d) => d.value));
    const step = niceStep(max);
    const top = Math.max(step, Math.ceil(max / step) * step);
    const innerW = width - padL - padR;
    const innerH = height - padT - padB;
    const slot = innerW / data.length;
    const barW = Math.min(slot * 0.64, 40);
    const y = (value) => padT + innerH - (value / top) * innerH;
    const ticks = [];
    for (let v = 0; v <= top; v += step) ticks.push(v);
    const hasData = max > 0;

    return (<div ref={ref} className="chart-box" style={{ height }}>
      <svg width={width} height={height} role="img" aria-label={ariaLabel}>
        {ticks.map((tick) => (<g key={tick}>
          <line x1={padL} x2={width - padR} y1={y(tick)} y2={y(tick)} className={tick === 0 ? 'axis-line' : 'grid-line'} />
          <text x={padL - 8} y={y(tick) + 4} textAnchor="end" className="axis-text">{tick}</text>
        </g>))}
        {data.map((d, i) => {
            const cx = padL + slot * i + slot / 2;
            const h = Math.max(d.value > 0 ? 3 : 0, (d.value / top) * innerH);
            return (<g key={`${d.label}-${i}`}>
              <rect className="chart-bar" x={cx - barW / 2} y={padT + innerH - h} width={barW} height={h} rx={Math.min(6, barW / 2)}
                fill={d.color || 'var(--primary)'} style={{ animationDelay: `${i * 30}ms` }}>
                <title>{d.tip || `${d.label}: ${d.value}`}</title>
              </rect>
              {d.value > 0 && <text x={cx} y={padT + innerH - h - 6} textAnchor="middle" className="value-text">{d.value}</text>}
              <text x={cx} y={height - 10} textAnchor="middle" className={`axis-text${d.strong ? ' strong' : ''}`}>{slot < 46 && d.short ? d.short : d.label}</text>
            </g>);
        })}
      </svg>
      {!hasData && <div className="chart-empty">{empty}</div>}
    </div>);
};

export default BarChart;
