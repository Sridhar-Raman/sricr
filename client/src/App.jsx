import { Navigate, Route, Routes } from 'react-router-dom';
import AuthLayout from './components/AuthLayout';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import SiteLayout from './components/site/SiteLayout';
import AppointmentTypes from './pages/AppointmentTypes';
import Calendar from './pages/Calendar';
import Dashboard from './pages/Dashboard';
import ForgotPassword from './pages/ForgotPassword';
import Login from './pages/Login';
import Profile from './pages/Profile';
import ResetPassword from './pages/ResetPassword';
import BookAppointment from './pages/portal/BookAppointment';
import MyAppointments from './pages/portal/MyAppointments';
import About from './pages/site/About';
import Faq from './pages/site/Faq';
import Gallery from './pages/site/Gallery';
import Home from './pages/site/Home';
import Signup from './pages/site/Signup';
import Users from './pages/Users';

const App = () => (
  <Routes>
    {/* Public marketing site */}
    <Route element={<SiteLayout />}>
      <Route index element={<Home />} />
      <Route path="about" element={<About />} />
      <Route path="gallery" element={<Gallery />} />
      <Route path="faq" element={<Faq />} />
    </Route>

    {/* Log in / Sign up use the app's layout (plum page + side menu), not the landing page's */}
    <Route element={<AuthLayout />}>
      <Route path="login" element={<Login />} />
      <Route path="signup" element={<Signup />} />
      <Route path="forgot-password" element={<ForgotPassword />} />
      <Route path="reset-password" element={<ResetPassword />} />
    </Route>

    {/* The app: every signed-in user lands here after signing up or logging in */}
    <Route path="app" element={<ProtectedRoute />}>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="appointment-types" element={<AppointmentTypes />} />
        <Route path="profile" element={<Profile />} />
        {/* clients only: their own bookings and the booking flow */}
        <Route element={<ProtectedRoute roles={['client']} />}>
          <Route path="my-appointments" element={<MyAppointments />} />
          <Route path="book" element={<BookAppointment />} />
        </Route>
        {/* admin only: creating and managing accounts */}
        <Route element={<ProtectedRoute adminOnly />}>
          <Route path="users" element={<Users />} />
        </Route>
      </Route>
    </Route>

    {/* old client-portal addresses */}
    <Route path="portal" element={<Navigate to="/app/my-appointments" replace />} />
    <Route path="portal/book" element={<Navigate to="/app/book" replace />} />
    <Route path="portal/*" element={<Navigate to="/app" replace />} />

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
