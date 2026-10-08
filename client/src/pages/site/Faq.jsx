import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../components/Icon';

const QUESTIONS = [
    { q: 'How do I book an appointment?', a: (<><Link to="/signup">Create an account</Link>, open “Book an appointment”, choose a service, pick a day and a time, then confirm. Your booking appears in “My appointments” straight away.</>) },
    { q: 'Can I reschedule or cancel?', a: 'Yes. While an appointment is still scheduled you can move it to another free time or cancel it from “My appointments”.' },
    { q: 'How are the available times decided?', a: 'Times come from our working hours and the length of the service you choose, minus times that are already taken. A slot disappears once the team is fully booked for it.' },
    { q: 'Why can’t I see any times on a day?', a: 'Either that day is outside our working days, it is fully booked, or it is too close to now — we need a little notice. Try another day.' },
    { q: 'Who can see my appointments?', a: 'You can, and the staff who look after bookings. Other clients never can.' },
    { q: 'Is my password safe?', a: 'Passwords are stored as one-way hashes, never in plain text, and repeated failed sign-ins are rate limited.' },
    { q: 'I forgot my password. What now?', a: 'Self-service password reset is not available yet. Please contact the team and an administrator can help you regain access.' },
    { q: 'I work here. How do I sign in?', a: (<>Staff use the same <Link to="/login">Log in</Link> page with the account an administrator created for them, and land on the team dashboard.</>) },
];

const Faq = () => {
    const [open, setOpen] = useState(0);
    return (<>
      <section className="page-hero">
        <span className="eyebrow">FAQ</span>
        <h1>Frequently asked questions</h1>
        <p>Quick answers about booking, changing and managing your appointments.</p>
      </section>
      <section className="section narrow">
        <div className="accordion">
          {QUESTIONS.map((item, index) => {
              const isOpen = open === index;
              return (<div key={item.q} className={`acc-item${isOpen ? ' open' : ''}`}>
                <h3>
                  <button type="button" className="acc-btn" aria-expanded={isOpen} aria-controls={`faq-${index}`} onClick={() => setOpen(isOpen ? -1 : index)}>
                    {item.q}<Icon name="chevron-down" size={20} />
                  </button>
                </h3>
                <div id={`faq-${index}`} role="region" className="acc-panel" hidden={!isOpen}><p>{item.a}</p></div>
              </div>);
          })}
        </div>
        <p className="faq-foot">Still have a question? <Link to="/signup">Create an account</Link> and try a booking, or reach out to the team.</p>
      </section>
    </>);
};

export default Faq;
