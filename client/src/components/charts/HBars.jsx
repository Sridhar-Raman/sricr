import { useEffect, useState } from 'react';

/** Horizontal bars with the value on the right. items: [{ label, value, color }]. Bars slide in on mount. */
const HBars = ({ items, empty = 'Nothing to show yet.' }) => {
    const [ready, setReady] = useState(false);
    useEffect(() => { const t = setTimeout(() => setReady(true), 40); return () => clearTimeout(t); }, []);
    const max = Math.max(1, ...items.map((i) => i.value));
    if (!items.length) return <p className="chart-empty-inline">{empty}</p>;

    return (<ul className="hbars">
      {items.map((item) => (<li key={item.label}>
        <div className="hbar-head"><span className="hbar-label"><span className="dot" style={{ background: item.color }} />{item.label}</span><b>{item.value}</b></div>
        <div className="hbar-track" title={`${item.label}: ${item.value}`}>
          <i className="hbar-fill" style={{ width: ready ? `${(item.value / max) * 100}%` : 0, background: item.color }} />
        </div>
      </li>))}
    </ul>);
};

export default HBars;
