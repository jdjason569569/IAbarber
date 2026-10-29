export interface ScheduleAppointmentRequest {
  client: string;
  date: string;
  time: string;
  serviceCost?: number;
  extras?: { name: string; price: number }[];
}

export interface SetCancelledRequest {
  cancelled: boolean;
}

export interface SetCompletedRequest {
  completed: boolean;
}
