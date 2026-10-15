export interface AppointmentDto {
  id: number;
  client: string;
  service: string;
  barber: string;
  date: string;
  time: string;
  status: string;
}

export interface ScheduleAppointmentInput {
  client: string;
  service: string;
  barber: string;
  date: string;
  time: string;
}
