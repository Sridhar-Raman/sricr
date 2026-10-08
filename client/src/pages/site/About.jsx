import { Link } from 'react-router-dom';
import Icon from '../../components/Icon';

const VALUES = [
    { icon: 'heart', title: 'People first', text: 'Booking should feel effortless for the person on the other side of the screen.' },
    { icon: 'shield', title: 'Privacy matters', text: 'Clients see only their own appointments. Staff access is separate and role-based.' },
    { icon: 'calendar-check', title: 'No double-booking', text: 'Availability is calculated from real bookings, working hours and team capacity.' },
];

const About = () => (<>
  <section className="page-hero">
    <span className="eyebrow">About us</span>
    <h1>Appointments, made simple</h1>
    <p>We built a booking experience that gets out of the way, so clients can book in moments and teams can spend their time on the work itself.</p>
  </section>

  <section className="section split">
    <div>
      <h2>What we do</h2>
      <p>SRI.CR gives every client a self-service space to book, reschedule and cancel, and gives your team a calendar to see the whole day at a glance.</p>
      <p>Services are configured once — name, duration and buffer time — and the system works out which start times are genuinely free.</p>
      <Link to="/signup" className="pill-btn">Get started</Link>
    </div>
    <ul className="check-list">
      <li><Icon name="check" size={18} />Online booking, available whenever your clients are</li>
      <li><Icon name="check" size={18} />Clear working hours and slot lengths</li>
      <li><Icon name="check" size={18} />Drag-and-drop team calendar with Day, Week and Month views</li>
      <li><Icon name="check" size={18} />Role-based access for admins, staff and clients</li>
    </ul>
  </section>

  <section className="section">
    <div className="section-head"><span className="eyebrow">What we believe</span><h2>Our principles</h2></div>
    <div className="feature-grid three">
      {VALUES.map((value) => (
        <article key={value.title} className="feature-card">
          <span className="feature-icon"><Icon name={value.icon} size={22} /></span>
          <h3>{value.title}</h3><p>{value.text}</p>
        </article>
      ))}
    </div>
  </section>
</>);

export default About;
