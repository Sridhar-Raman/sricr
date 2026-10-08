import { Link } from 'react-router-dom';
import Icon from '../../components/Icon';
import HeroArt from '../../components/site/HeroArt';
import { homeFor, useAuth } from '../../context/AuthContext';

const FEATURES = [
    { icon: 'zap', title: 'Book in a minute', text: 'Choose a service, pick a day and tap a time. No phone calls, no back-and-forth.' },
    { icon: 'clock', title: 'Only real availability', text: 'Times are checked against existing bookings and the team’s capacity, so what you see is what you get.' },
    { icon: 'refresh', title: 'Change your mind', text: 'Reschedule or cancel your own appointments any time before they start.' },
    { icon: 'shield', title: 'Private by design', text: 'You only ever see your own bookings. Passwords are stored hashed, never in plain text.' },
];

const STEPS = [
    { n: '1', title: 'Create your account', to: '/signup', text: (<><Link to="/signup">Sign up</Link> with your email in under a minute.</>) },
    { n: '2', title: 'Choose a service and time', text: 'Browse the open slots and pick the one that suits you.' },
    { n: '3', title: 'Manage it anywhere', text: 'See, move or cancel your appointment from your bookings page.' },
];

const Home = () => {
    const { user } = useAuth();
    return (<>
      <section className="hero">
        <div className="hero-copy">
          <h1>Appointment<br />Booking</h1>
          <p>Pick a service, choose a time that suits you and get booked in seconds. Everything you need to schedule, move or cancel an appointment — all in one place.</p>
          <div className="hero-actions">
            <Link to="/about" className="pill-btn">More</Link>
            <Link to={user ? homeFor(user) : '/signup'} className="pill-btn pill-ghost">{user ? 'Go to my account' : 'Book now'}<Icon name="arrow-right" size={16} /></Link>
          </div>
        </div>
        <div className="hero-visual"><HeroArt /></div>
      </section>

      <section className="section" aria-labelledby="why-title">
        <div className="section-head">
          <span className="eyebrow">Why book online</span>
          <h2 id="why-title">Scheduling that respects your time</h2>
          <p>Built for clients who want it quick and teams who want it organised.</p>
        </div>
        <div className="feature-grid">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="feature-card">
              <span className="feature-icon"><Icon name={feature.icon} size={22} /></span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="how-title">
        <div className="section-head">
          <span className="eyebrow">How it works</span>
          <h2 id="how-title">Three steps to your appointment</h2>
        </div>
        <ol className="steps">
          {STEPS.map((step) => (
            <li key={step.n}><span className="step-n">{step.n}</span><h3>{step.to ? <Link to={step.to}>{step.title}</Link> : step.title}</h3><p>{step.text}</p></li>
          ))}
        </ol>
      </section>

      <section className="cta-band">
        <div>
          <h2>Ready to book your first appointment?</h2>
          <p>Create a free account and see the available times straight away.</p>
        </div>
        <Link to={user ? homeFor(user) : '/signup'} className="pill-btn pill-light">{user ? 'Open my account' : 'Sign up now'}</Link>
      </section>
    </>);
};

export default Home;
