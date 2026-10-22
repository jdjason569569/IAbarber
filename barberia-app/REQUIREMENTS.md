# BarberIA – Appointment Requirements

## 1. Overview

BarberIA is a barbershop app (Ionic + Angular, Android via Capacitor) used to manage client appointments. Appointments are stored through the BarberIA API (NestJS) in Supabase, and can be created by voice.

## 2. Appointment data

Every appointment must store:

| Field | Type | Required | Description |
|---|---|---|---|
| `clientName` | string | yes | Name of the client. |
| `date` | string (`YYYY-MM-DD`) | yes | Day of the appointment. The weekday (Monday, Tuesday, ...) is derived from this date and is not stored separately. |
| `time` | string (`HH:mm`, 24h) | yes | Start time. Needed to schedule more than one client per day. |
| `service` | string | yes | Service booked (for example "Classic Haircut"). |
| `serviceCost` | number | yes | Base price of the service. Cannot be negative. |
| `extras` | list of `{ name, price }` | no | Additional items charged on top of the service (for example hair wax). Empty by default. |
| `status` | `pending` \| `confirmed` \| `completed` \| `cancelled` | yes | Starts as `pending`. |
| `id` | number | generated | Unique identifier assigned by the database. |

### Total price

`total = serviceCost + sum(extras[].price)`

The total is calculated, never stored.

## 3. Functional requirements

### 3.1 List appointments
- **FR-1** The app shows all appointments with: client name, service, date, time, service price, each extra with its price, total and status.
- **FR-2** All appointments are shown in a single list, ordered as returned by the API; there are no status tabs. The status is shown as a badge on each appointment.
- **FR-3** The list is loaded from the API and shows a loading state, an empty state and an error state.

### 3.2 Create an appointment
- **FR-4** An appointment can be created from the app with the fields in section 2.
- **FR-5** Validation: client name and service are required; `serviceCost` cannot be negative; `date` is a valid ISO date and `time` a valid `HH:mm`.
- **FR-6** New appointments start with status `pending`.

### 3.3 Create an appointment by voice
- **FR-7** Pressing the microphone button starts a guided dialog: the assistant asks, one question at a time, for the client name, the date, the time and the service.
- **FR-8** Each question is shown on screen and read aloud; the answer is captured by speech recognition.
- **FR-9** Several details can be given in one answer; already answered questions are skipped.
- **FR-10** Relative dates and times ("tomorrow", "at four") are resolved to a concrete date and time.
- **FR-11** The service price is taken from the configured services (see 3.6); the user can say "stop" to abort the dialog. If no services are configured the assistant tells the user to add them in Settings.
- **FR-12** When all data is collected the appointment is saved and the list refreshes.

### 3.4 Validations
- **FR-15** The shop has a single barber: two active appointments cannot share the same date and time. Cancelled appointments free their slot. The API answers `409 Conflict`.
- **FR-16** Appointments cannot be created in the past.
- **FR-17** `date` must be a real calendar date and `time` a valid `HH:mm`.
- **FR-18** In the voice dialog, a taken slot or a past date does not end the conversation: the assistant keeps the answers and asks again only for the time (or date).

### 3.5 Change status
- **FR-13** An appointment can be marked `confirmed`, `completed` or `cancelled` (API: `PATCH /appointments/:id/status`).
- **FR-14** Cancelling by voice requires an explicit confirmation.

### 3.6 Settings (services)
- **FR-19** The app has a **Settings** tab where the shop manages the services it offers (name and price).
- **FR-20** A service can be added with a name (required, up to 60 characters, unique ignoring case) and a price (0 to 100000).
- **FR-21** A service can be deleted after confirmation. Existing appointments keep their stored service name and price.
- **FR-22** The voice assistant uses only the configured services to understand and price appointments. There is no built-in service list.
- **FR-23** API: `GET /services`, `POST /services`, `DELETE /services/:id`; duplicates answer `409`, invalid data `400`.

## 4. Non-functional requirements

- **NFR-1** Persistence in Supabase (Postgres); the app never talks to the database directly.
- **NFR-2** API keys (Supabase, Gemini) live only in the backend `.env`, never in the app.
- **NFR-3** The audio stays on the phone; only the recognized text is sent to the backend.
- **NFR-4** The UI is in Spanish. Every user-visible text comes from one central message catalog (i18n); source code and identifiers are in English.
- **NFR-5** The backend follows hexagonal architecture; the LLM provider is replaceable behind a port.

## 5. Out of scope (for now)

- User login and multiple barbershops.
- Editing or deleting an appointment's data after creation.
- Payments, reminders and notifications.
- Several barbers (the shop has a single barber, so no barber is stored).
- Opening hours and service duration (overlapping appointments).

## 6. Open questions

- Should services be editable (change price) and should extras also be configurable?
- What are the opening hours and the duration of each service?
