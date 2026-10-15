import { Appointment } from '../models/appointment.model';

export const APPOINTMENTS_MOCK: Appointment[] = [
  { id: 1, clientName: 'Michael Torres', date: '2026-10-13', time: '09:00', service: 'Classic Haircut', barber: 'Carlos', serviceCost: 15, extras: [{ name: 'Hair wax', price: 5 }], status: 'confirmed' },
  { id: 2, clientName: 'Daniel Rivera', date: '2026-10-13', time: '10:30', service: 'Beard Trim', barber: 'Luis', serviceCost: 10, extras: [], status: 'pending' },
  { id: 3, clientName: 'James Walker', date: '2026-10-13', time: '12:00', service: 'Haircut + Beard', barber: 'Carlos', serviceCost: 22, extras: [{ name: 'Hot towel', price: 3 }, { name: 'Aftershave', price: 4 }], status: 'completed' },
  { id: 4, clientName: 'Andrew Scott', date: '2026-10-14', time: '11:00', service: 'Fade Haircut', barber: 'Luis', serviceCost: 18, extras: [], status: 'confirmed' },
  { id: 5, clientName: 'Robert Hill', date: '2026-10-14', time: '16:30', service: 'Classic Haircut', barber: 'Carlos', serviceCost: 15, extras: [{ name: 'Eyebrow trim', price: 4 }], status: 'cancelled' },
];
