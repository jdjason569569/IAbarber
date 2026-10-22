export interface ScheduleAppointmentRequest {
  client: string;
  service: string;
  date: string;
  time: string;
  serviceCost?: number;
  extras?: { name: string; price: number }[];
}

export interface UpdateStatusRequest {
  status: string;
}
