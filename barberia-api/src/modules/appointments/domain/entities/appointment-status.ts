export const APPOINTMENT_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
