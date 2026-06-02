# AI Hospital Management System - API Contract

## Base URL

```text
/api/v1
```

## Authentication

All protected APIs require an access token.

```text
Authorization: Bearer <access_token>
```

## Standard Response Shape

### Success

```text
{
  "success": true,
  "data": {},
  "message": "Request completed successfully"
}
```

### Error

```text
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload",
    "details": []
  }
}
```

## Auth APIs

```text
POST   /auth/register
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh-token
POST   /auth/forgot-password
POST   /auth/reset-password
GET    /auth/me
```

## Patient APIs

```text
GET    /patients/me
PATCH  /patients/me
GET    /patients/me/appointments
GET    /patients/me/medical-records
POST   /patients/me/medical-records
GET    /patients/me/payments
GET    /patients/me/refunds
```

## Doctor APIs

```text
GET    /doctors
GET    /doctors/:id
GET    /doctors/me
PATCH  /doctors/me
PATCH  /doctors/me/availability
GET    /doctors/me/appointments
GET    /doctors/me/patients/:patientId
POST   /doctors/me/prescriptions
```

## Appointment APIs

```text
POST   /appointments
GET    /appointments/:id
PATCH  /appointments/:id/reschedule
PATCH  /appointments/:id/cancel
PATCH  /appointments/:id/complete
```

## Payment APIs

```text
POST   /payments/create-order
POST   /payments/verify
GET    /payments/:id
POST   /payments/webhook/razorpay
```

Important payment rule:

The frontend must never be trusted as the source of truth for payment success. The backend must verify Razorpay signatures and reconcile final state using Razorpay webhooks.

## Refund APIs

```text
POST   /refunds
GET    /refunds
GET    /refunds/:id
PATCH  /refunds/:id/approve
PATCH  /refunds/:id/reject
POST   /refunds/:id/process
```

## Chatbot APIs

```text
POST   /chat/sessions
GET    /chat/sessions
GET    /chat/sessions/:id/messages
POST   /chat/sessions/:id/messages
```

## RAG APIs

```text
POST   /rag/documents
GET    /rag/documents
GET    /rag/documents/:id
DELETE /rag/documents/:id
POST   /rag/query
POST   /rag/reindex
```

## Admin APIs

```text
GET    /admin/users
PATCH  /admin/users/:id/status
GET    /admin/doctors/pending
PATCH  /admin/doctors/:id/approve
PATCH  /admin/doctors/:id/reject
GET    /admin/appointments
GET    /admin/payments
GET    /admin/refunds
GET    /admin/audit-logs
```

## Analytics APIs

```text
GET    /analytics/admin/overview
GET    /analytics/admin/revenue
GET    /analytics/admin/appointments
GET    /analytics/admin/doctors
GET    /analytics/doctor/overview
GET    /analytics/patient/overview
```

## API Security Rules

- Validate every request body, query parameter, and route parameter.
- Apply role-based authorization middleware to every protected route.
- Use rate limiting for login, payment, refund, and chatbot endpoints.
- Use idempotency keys for payment and refund operations.
- Validate Razorpay webhook signatures.
- Log sensitive actions into audit_logs.
- Never expose password hashes, tokens, internal IDs unnecessarily, or provider secrets.

