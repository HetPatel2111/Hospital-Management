# Doctor Management Module

## Public Contract

Base URL:

```text
/api/v1
```

All doctor management routes require JWT authentication.

## Patient Doctor Discovery

```text
GET /doctors
GET /doctors/:id
```

Supported query parameters:

```text
page
limit
search
specialization
minExperience
maxExperience
minFee
maxFee
sortBy: createdAt | experienceYears | consultationFee | specialization
sortOrder: asc | desc
```

## Doctor Self-Service

```text
GET   /doctors/me
PATCH /doctors/me
PATCH /doctors/me/availability
```

## Admin Doctor Management

```text
GET    /admin/doctors/pending
POST   /admin/doctors
PATCH  /admin/doctors/:id
DELETE /admin/doctors/:id
PATCH  /admin/doctors/:id/approve
PATCH  /admin/doctors/:id/reject
PATCH  /admin/doctors/:id/activate
PATCH  /admin/doctors/:id/deactivate
```

## Notes

- `fullName` is stored in the linked `users.name` field.
- `experience` is stored as `experienceYears`.
- `qualifications` are stored as `qualification`.
- `consultation fees` are stored as `consultationFee`.
- `availabilityStatus` is derived from `status` and weekly availability.
- `rating` is returned as a computed value until a review schema is introduced.
- `profileImage` is returned as `null` because the approved database schema does not include a persisted profile image field.

## Postman Examples

### Create Doctor

```json
POST /api/v1/admin/doctors
Authorization: Bearer <adminAccessToken>

{
  "fullName": "Dr. Asha Mehta",
  "email": "asha.mehta@example.com",
  "phone": "9876543210",
  "password": "Doctor123",
  "specialization": "Cardiology",
  "experienceYears": 12,
  "qualification": ["MBBS", "MD Cardiology"],
  "registrationNumber": "MED-CARD-1001",
  "consultationFee": 120000,
  "bio": "Consultant cardiologist with 12 years of experience.",
  "status": "approved"
}
```

### Search Doctors

```text
GET /api/v1/doctors?search=cardio&minExperience=5&maxFee=150000&page=1&limit=10&sortBy=consultationFee&sortOrder=asc
Authorization: Bearer <patientAccessToken>
```

### Update Doctor Profile

```json
PATCH /api/v1/doctors/me
Authorization: Bearer <doctorAccessToken>

{
  "bio": "Senior cardiologist focused on preventive cardiac care.",
  "consultationFee": 130000
}
```

### Update Availability

```json
PATCH /api/v1/doctors/me/availability
Authorization: Bearer <doctorAccessToken>

{
  "availability": {
    "weeklySchedule": [
      {
        "dayOfWeek": 1,
        "isAvailable": true,
        "slots": [
          {
            "startTime": "10:00",
            "endTime": "13:00"
          }
        ]
      }
    ],
    "exceptions": []
  }
}
```
