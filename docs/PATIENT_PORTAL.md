# Patient Portal API Documentation

Base URL:

```text
/api/v1
```

All patient portal routes require:

```text
Authorization: Bearer <access_token>
```

All patient portal routes are restricted to users with the `patient` role.

## Patient Profile

### View Profile

```text
GET /patients/me
```

Returns the authenticated patient's user and profile data. If a patient profile is missing for an existing patient user, the backend creates a default profile.

### Update Profile

```text
PATCH /patients/me
```

Supported body fields:

```json
{
  "name": "Patient Name",
  "phone": "9876543210",
  "dateOfBirth": "1995-01-01",
  "gender": "undisclosed",
  "bloodGroup": "unknown",
  "address": {
    "line1": "Street",
    "line2": "Area",
    "city": "Ahmedabad",
    "state": "Gujarat",
    "country": "India",
    "postalCode": "380001"
  },
  "emergencyContact": {
    "name": "Emergency Contact",
    "phone": "9876543211",
    "relationship": "Parent"
  },
  "medicalHistory": ["Asthma"],
  "allergies": ["Penicillin"],
  "currentMedications": ["Medication name"],
  "insuranceDetails": {
    "provider": "Insurance Provider",
    "policyNumber": "POLICY-123",
    "validUntil": "2027-01-01"
  }
}
```

### Upload Profile Picture

```text
PATCH /patients/me/profile-picture
```

Current implementation stores a validated profile picture URL.

```json
{
  "profilePictureUrl": "https://example.com/profile.jpg"
}
```

Object storage upload integration can be added later without changing the patient profile model.

## Dashboard

```text
GET /patients/me/dashboard
```

Returns:

- Profile completion percentage
- Total appointments
- Upcoming appointments
- Completed appointments
- Cancelled appointments
- Unread notifications

## Notifications

```text
GET /patients/me/notifications?page=1&limit=10&status=unread&type=appointment
```

Supported filters:

- `status`: `unread`, `read`
- `type`: `appointment`, `payment`, `refund`, `prescription`, `system`
- `page`
- `limit`

## Appointment Views

These endpoints are read-only. Appointment booking is not implemented in this phase.

```text
GET /patients/me/appointments
GET /patients/me/appointments/upcoming
GET /patients/me/appointments/completed
GET /patients/me/appointments/cancelled
```

Supported query parameters:

- `page`
- `limit`
- `sortOrder`: `asc`, `desc`

## Doctor Discovery

Doctor discovery uses the existing protected doctor endpoints:

```text
GET /doctors
GET /doctors/:id
```

Supported query parameters:

- `page`
- `limit`
- `search`
- `specialization`
- `minExperience`
- `maxExperience`
- `minFee`
- `maxFee`
- `sortBy`: `createdAt`, `experienceYears`, `consultationFee`, `specialization`
- `sortOrder`: `asc`, `desc`

Only approved doctors are returned to patients.

## Audit Logging

The following patient portal actions create audit log entries:

- Patient profile view
- Patient profile update
- Patient profile picture upload
- Patient dashboard view
- Patient notifications view
- Patient appointments view
- Doctor discovery view
- Doctor profile view

## Testing Checklist

- Verify patient-only RBAC blocks doctor and admin users from `/patients/*`.
- Verify unauthenticated users receive `401`.
- Verify `GET /patients/me` returns a patient profile.
- Verify `PATCH /patients/me` validates enum fields and future `dateOfBirth`.
- Verify `PATCH /patients/me/profile-picture` rejects invalid URLs.
- Verify notifications pagination and filters.
- Verify appointment history pagination and sorting.
- Verify upcoming appointments include only pending/confirmed future appointments.
- Verify completed appointments include only completed records.
- Verify cancelled appointments include only cancelled records.
- Verify doctor discovery search, specialization, experience, fee, pagination, and sorting.
- Verify audit logs are created for patient profile, dashboard, notifications, appointments, and doctor discovery views.
