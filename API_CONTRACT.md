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
GET    /payments/my-payments
GET    /admin/payments
```

### Payments APIs Details

#### Create Order: `POST /payments/create-order`
- **Request Body**:
  ```json
  { "appointmentId": "ObjectId" }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "keyId": "string",
      "orderId": "string",
      "amount": number,
      "currency": "INR",
      "paymentId": "ObjectId"
    }
  }
  ```

#### Verify Payment: `POST /payments/verify`
- **Request Body**:
  ```json
  {
    "appointmentId": "ObjectId",
    "razorpayOrderId": "string",
    "razorpayPaymentId": "string",
    "razorpaySignature": "string",
    "paymentMethod": "string (optional)",
    "gatewayResponse": "object (optional)"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "success": true,
      "paymentStatus": "success",
      "appointmentStatus": "confirmed"
    }
  }
  ```

#### Payment Details: `GET /payments/:id`
- **Response**: Returns the fully populated payment details, including appointment slot, patient credentials, and gateway response metadata.

#### Patient Payments: `GET /payments/my-payments`
- **Response**: Returns an array of transactions linked to the authenticated patient.

#### Admin Payments: `GET /admin/payments`
- **Query Params**: `page` (default 1), `limit` (default 10), `status` (pending|success|failed|refunded), `refundStatus` (none|requested|processing|refunded), `patientId`, `doctorId`
- **Response**:
  ```json
  {
    "success": true,
    "data": [ ... ],
    "pagination": {
      "total": number,
      "page": number,
      "limit": number,
      "pages": number
    }
  }
  ```

Important payment rule:

The frontend must never be trusted as the source of truth for payment success. The backend must verify Razorpay signatures and reconcile final state using Razorpay webhooks.

## Refund APIs

```text
POST   /refunds/request
GET    /refunds/my-refunds
GET    /admin/refunds
PATCH  /admin/refunds/:id/approve
PATCH  /admin/refunds/:id/reject
PATCH  /admin/refunds/:id/process
```

### Refund API Details

#### Request Refund: `POST /refunds/request`
- **Access**: Patient (authenticated)
- **Request Body**:
  ```json
  {
    "appointmentId": "ObjectId",
    "refundReason": "string (at least 5 characters)"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "_id": "ObjectId",
      "appointmentId": "ObjectId",
      "paymentId": "ObjectId",
      "patientId": "ObjectId",
      "amount": number,
      "refundPercentage": number,
      "refundAmount": number,
      "refundReason": "string",
      "refundStatus": "requested",
      "requestedAt": "Date"
    }
  }
  ```

#### Get My Refunds: `GET /refunds/my-refunds`
- **Access**: Patient (authenticated)
- **Response**: Returns a list of all refunds requested by the current patient.

#### Get All Refunds: `GET /admin/refunds`
- **Access**: Admin (authenticated)
- **Query Params**: `page` (default 1), `limit` (default 10), `status` (requested|approved|rejected|processing|refunded), `patientId`
- **Response**: Returns paginated administrative refund requests review queue.

#### Approve Refund: `PATCH /admin/refunds/:id/approve`
- **Access**: Admin (authenticated)
- **Request Body**:
  ```json
  { "adminRemarks": "string (optional)" }
  ```
- **Response**: Returns the approved refund record.

#### Reject Refund: `PATCH /admin/refunds/:id/reject`
- **Access**: Admin (authenticated)
- **Request Body**:
  ```json
  { "adminRemarks": "string (required, at least 5 chars)" }
  ```
- **Response**: Returns the rejected refund record.

#### Process Refund: `PATCH /admin/refunds/:id/process`
- **Access**: Admin (authenticated)
- **Response**: Triggers Razorpay refund via SDK, sets status to `refunded` on success, and logs transactions.

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

