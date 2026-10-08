import { booking } from '../config/booking.js';

export const BRAND = 'SRI.CR';
const PLUM = '#703a4b';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// With several allowed origins, links in emails use the first (primary) one.
export const siteUrl = () => (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',')[0].trim().replace(/\/$/, '');

/** "Good morning/afternoon/evening" by the business's local time. */
export const greetingFor = (name, now = new Date()) => {
    const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: booking.timezone, hour: '2-digit', hourCycle: 'h23' }).format(now));
    const part = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    return `Good ${part}, ${name || 'there'},`;
};

/**
 * One layout for every email. Returns { html, text }: the HTML is table-based with inline styles so it renders in
 * Gmail/Outlook, and the plain-text part carries the same content (links included) for text-only clients.
 *
 * @param {object} o
 * @param {string} o.name        recipient's name, for the greeting
 * @param {string} o.title       headline
 * @param {string[]} o.intro     paragraphs before the details
 * @param {[string,string][]} [o.details]  label/value rows
 * @param {{label:string,url:string}} [o.button]
 * @param {string[]} [o.outro]   paragraphs after the details
 * @param {string} o.reason      completes "You are receiving this email because ..."
 */
export const renderEmail = ({ name, title, intro = [], details = [], button, outro = [], reason }) => {
    const greeting = greetingFor(name);
    const reasonText = `You are receiving this email because ${reason}`;

    const text = [
        greeting,
        '',
        ...intro.flatMap((p) => [p, '']),
        ...(details.length ? [...details.map(([k, v]) => `${k}: ${v}`), ''] : []),
        ...(button ? [`${button.label}: ${button.url}`, ''] : []),
        ...outro.flatMap((p) => [p, '']),
        'Kind regards,',
        `The ${BRAND} team`,
        '',
        '--',
        reasonText,
    ].join('\n');

    const p = (content) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#2a1521;">${escapeHtml(content)}</p>`;
    const rows = details.map(([k, v]) => `<tr><td style="padding:8px 14px 8px 0;font-size:14px;color:#6b5560;white-space:nowrap;vertical-align:top;">${escapeHtml(k)}</td><td style="padding:8px 0;font-size:14px;color:#2a1521;font-weight:600;">${escapeHtml(v)}</td></tr>`).join('');
    const detailsHtml = details.length
        ? `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:6px 0 20px;padding:10px 18px;background:#f7f1f3;border-left:4px solid ${PLUM};border-radius:6px;">${rows}</table>`
        : '';
    const buttonHtml = button
        ? `<p style="margin:6px 0 22px;"><a href="${escapeHtml(button.url)}" style="display:inline-block;padding:12px 26px;background:${PLUM};color:#ffffff;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">${escapeHtml(button.label)}</a></p>`
        : '';

    const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#efeae6;font-family:Segoe UI,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#efeae6;padding:24px 12px;"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;">
    <tr><td style="background:${PLUM};padding:20px 28px;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:.2px;">${BRAND}</td></tr>
    <tr><td style="padding:28px 28px 8px;">
      <h1 style="margin:0 0 18px;font-size:21px;line-height:1.3;color:#2a1521;">${escapeHtml(title)}</h1>
      ${p(greeting)}
      ${intro.map(p).join('')}
      ${detailsHtml}
      ${buttonHtml}
      ${outro.map(p).join('')}
      <p style="margin:18px 0 0;font-size:15px;line-height:1.6;color:#2a1521;">Kind regards,<br>The ${BRAND} team</p>
    </td></tr>
    <tr><td style="padding:22px 28px 26px;">
      <hr style="border:0;border-top:1px solid #e5dde0;margin:0 0 14px;">
      <p style="margin:0;font-size:12px;line-height:1.6;color:#8a7680;">${escapeHtml(reasonText)}</p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

    return { html, text };
};
