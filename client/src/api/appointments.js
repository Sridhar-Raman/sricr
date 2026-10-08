import api from './client';

export const fetchAppointments = (params) => api.get('/appointments', { params }).then((r) => r.data.appointments);
export const fetchAssignees = () => api.get('/appointments/assignees').then((r) => r.data.assignees);
export const createAppointment = (body) => api.post('/appointments', body).then((r) => r.data.appointment);
export const updateAppointment = (id, body) => api.patch(`/appointments/${id}`, body).then((r) => r.data.appointment);
export const cancelAppointment = (id, reason) => api.post(`/appointments/${id}/cancel`, { reason }).then((r) => r.data.appointment);

export const STATUS_LABELS = { scheduled: 'Scheduled', completed: 'Completed', cancelled: 'Cancelled', 'no-show': 'No show' };
