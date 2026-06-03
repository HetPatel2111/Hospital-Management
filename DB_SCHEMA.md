# AI Hospital Management System - Database Schema

## Scope

This document defines the production database schema for the AI Hospital Management System.

It includes:

- MongoDB Atlas collections
- Qdrant vector collections
- Fields
- Relationships
- Indexes
- Validation rules

This document does not define controllers, services, or API routes.

## Design Principles

- Use MongoDB for operational and transactional hospital data.
- Use Qdrant for vector search and RAG retrieval.
- Keep authentication identity separate from role-specific profiles.
- Store payments and refunds as auditable financial records.
- Keep general RAG knowledge separate from patient-specific medical context.
- Enforce authorization in the application layer and reinforce integrity with indexes.
- Use soft state transitions for appointments, payments, refunds, and document indexing.

## Common Field Standards

All MongoDB collections should use:

```text
_id: ObjectId
createdAt: Date
updatedAt: Date
```

Recommended conventions:

- Use ObjectId references for internal relationships.
- Store money in the smallest currency unit, such as paise for INR.
- Use enums for business states.
- Avoid storing raw secrets or provider credentials.
- Never store plain-text passwords.
- Use audit logs for sensitive actions.

## MongoDB Collections

## 1. users

Stores shared identity and authentication data for patients, doctors, and admins.

### Fields

```text
_id: ObjectId
name: String
email: String
phone: String
passwordHash: String
role: String enum(patient, doctor, admin)
status: String enum(active, suspended, pending)
emailVerified: Boolean
phoneVerified: Boolean
lastLoginAt: Date
passwordChangedAt: Date
createdAt: Date
updatedAt: Date
```

### Relationships

```text
users._id -> patients.userId
users._id -> doctors.userId
users._id -> audit_logs.actorId
users._id -> chat_sessions.userId
```

### Indexes

```text
email: unique
phone: unique sparse
role
status
createdAt
```

### Validation Rules

- `name` is required.
- `email` is required, lowercase, trimmed, and unique.
- `phone` must be unique when present.
- `passwordHash` is required.
- `role` must be one of `patient`, `doctor`, or `admin`.
- `status` must be one of `active`, `suspended`, or `pending`.
- Doctors should start as `pending` until admin approval.
- Suspended users must not be allowed to authenticate.

## 2. patients

Stores patient-specific profile and medical metadata.

### Fields

```text
_id: ObjectId
userId: ObjectId
dateOfBirth: Date
gender: String enum(male, female, other, undisclosed)
bloodGroup: String enum(A+, A-, B+, B-, AB+, AB-, O+, O-, unknown)
address:
  line1: String
  line2: String
  city: String
  state: String
  country: String
  postalCode: String
emergencyContact:
  name: String
  phone: String
  relationship: String
medicalHistory: [String]
allergies: [String]
currentMedications: [String]
insuranceDetails:
  provider: String
  policyNumber: String
  validUntil: Date
createdAt: Date
updatedAt: Date
```

### Relationships

```text
patients.userId -> users._id
patients._id -> appointments.patientId
patients._id -> payments.patientId
patients._id -> prescriptions.patientId
patients._id -> medical_records.patientId
```

### Indexes

```text
userId: unique
bloodGroup
createdAt
```

### Validation Rules

- `userId` is required and must reference a user with role `patient`.
- One patient profile is allowed per user.
- `dateOfBirth` cannot be in the future.
- `gender` must match the allowed enum.
- `bloodGroup` must match the allowed enum.
- Emergency contact phone should be validated when present.

## 3. doctors

Stores doctor-specific profile, credentials, fee, and availability.

### Fields

```text
_id: ObjectId
userId: ObjectId
specialization: String
qualification: [String]
experienceYears: Number
registrationNumber: String
consultationFee: Number
availability:
  weeklySchedule:
    dayOfWeek: Number
    isAvailable: Boolean
    slots:
      startTime: String
      endTime: String
  exceptions:
    date: Date
    isAvailable: Boolean
    startTime: String
    endTime: String
    reason: String
status: String enum(pending, approved, rejected)
bio: String
createdAt: Date
updatedAt: Date
```

### Relationships

```text
doctors.userId -> users._id
doctors._id -> appointments.doctorId
doctors._id -> payments.doctorId
doctors._id -> prescriptions.doctorId
```

### Indexes

```text
userId: unique
registrationNumber: unique
specialization
status
consultationFee
specialization + status
```

### Validation Rules

- `userId` is required and must reference a user with role `doctor`.
- `registrationNumber` is required and unique.
- `specialization` is required.
- `qualification` must contain at least one value.
- `experienceYears` must be greater than or equal to `0`.
- `consultationFee` must be greater than or equal to `0`.
- `status` must be one of `pending`, `approved`, or `rejected`.
- Only approved doctors should appear in patient booking searches.
- Availability slots must have valid `startTime` and `endTime`.
- Availability slot `endTime` must be after `startTime`.

## 4. appointments

Stores appointment lifecycle between patients and doctors.

### Fields

```text
_id: ObjectId
patientId: ObjectId
doctorId: ObjectId
appointmentDate: Date
startTime: String
endTime: String
status: String enum(pending_payment, payment_completed, pending, confirmed, completed, cancelled, refunded, no_show)
reason: String
notes: String
cancellation:
  cancelledBy: ObjectId
  cancelledAt: Date
  reason: String
paymentId: ObjectId
createdAt: Date
updatedAt: Date
```

### Relationships

```text
appointments.patientId -> patients._id
appointments.doctorId -> doctors._id
appointments.paymentId -> payments._id
appointments._id -> prescriptions.appointmentId
appointments._id -> refunds.appointmentId
```

### Indexes

```text
patientId
doctorId
appointmentDate
status
paymentId sparse
doctorId + appointmentDate + startTime: unique
patientId + appointmentDate
doctorId + appointmentDate
```

### Validation Rules

- `patientId` is required.
- `doctorId` is required.
- `appointmentDate` is required.
- `startTime` and `endTime` are required.
- `endTime` must be after `startTime`.
- `status` must match the allowed enum.
- New appointments should start as `pending`.
- Appointment confirmation requires a verified paid payment.
- Completed appointments cannot be cancelled.
- The unique compound index on `doctorId + appointmentDate + startTime` prevents double booking.

## 5. payments

Stores Razorpay payment lifecycle and verification state.

### Fields

```text
_id: ObjectId
appointmentId: ObjectId
patientId: ObjectId
amount: Number
currency: String (default: "INR")
razorpayOrderId: String (unique)
razorpayPaymentId: String (sparse)
razorpaySignature: String
paymentStatus: String enum(pending, success, failed, refunded) (default: "pending")
paymentMethod: String
paidAt: Date
refundStatus: String enum(none, requested, processing, refunded) (default: "none")
gatewayResponse: Mixed
createdAt: Date
updatedAt: Date
```

### Relationships

```text
payments.appointmentId -> appointments._id
payments.patientId -> patients._id
payments.doctorId -> doctors._id
payments._id -> refunds.paymentId
```

### Indexes

```text
appointmentId
patientId
doctorId
razorpayOrderId: unique
razorpayPaymentId: unique sparse
status
createdAt
```

### Validation Rules

- `appointmentId`, `patientId`, and `doctorId` are required.
- `razorpayOrderId` is required and unique.
- `amount` must be greater than `0`.
- `currency` is required and should usually be `INR`.
- `status` must match the allowed enum.
- `signatureVerified` must be true before status becomes `paid`.
- Payment success must be verified server-side.
- Frontend payment status must never be trusted as final state.

## 6. refunds

Stores refund requests, approvals, provider processing, and final refund state.

### Fields

```text
_id: ObjectId
appointmentId: ObjectId
paymentId: ObjectId
patientId: ObjectId
amount: Number
refundPercentage: Number
refundAmount: Number
refundReason: String
refundStatus: String enum(requested, approved, rejected, processing, refunded) (default: "requested")
requestedAt: Date (default: now)
processedAt: Date
approvedBy: ObjectId (ref: User)
rejectedBy: ObjectId (ref: User)
adminRemarks: String
decisionAt: Date
gatewayRefundId: String
gatewayResponse: Mixed
createdAt: Date
updatedAt: Date
```

### Relationships

```text
refunds.paymentId -> payments._id
refunds.appointmentId -> appointments._id
refunds.patientId -> patients._id
refunds.approvedBy -> users._id
refunds.rejectedBy -> users._id
```

### Indexes

```text
appointmentId
paymentId
patientId
gatewayRefundId: unique sparse
refundStatus
createdAt
```

### Validation Rules

- `paymentId` and `appointmentId` are required.
- `requestedBy` is required.
- `amount` must be greater than `0`.
- Refund amount cannot exceed paid amount minus completed refunds.
- `status` must match the allowed enum.
- Only admins can approve or reject refunds.
- Razorpay refund processing can happen only after approval.
- Completed refunds cannot be edited except for audit metadata.

## 7. prescriptions

Stores doctor-created prescriptions after consultation.

### Fields

```text
_id: ObjectId
appointmentId: ObjectId
patientId: ObjectId
doctorId: ObjectId
diagnosis: String
medicines:
  name: String
  dosage: String
  frequency: String
  duration: String
  instructions: String
instructions: String
followUpDate: Date
createdAt: Date
updatedAt: Date
```

### Relationships

```text
prescriptions.appointmentId -> appointments._id
prescriptions.patientId -> patients._id
prescriptions.doctorId -> doctors._id
```

### Indexes

```text
appointmentId: unique
patientId
doctorId
createdAt
```

### Validation Rules

- `appointmentId`, `patientId`, and `doctorId` are required.
- One prescription is allowed per appointment unless versioning is introduced.
- The doctor must be assigned to the appointment.
- The patient must match the appointment patient.
- `medicines` can be empty only when diagnosis or instructions are present.
- `followUpDate` cannot be before the prescription creation date.

## 8. medical_records

Stores uploaded patient medical reports and metadata.

### Fields

```text
_id: ObjectId
patientId: ObjectId
uploadedBy: ObjectId
recordType: String enum(lab_report, prescription, imaging, discharge_summary, insurance, other)
title: String
fileUrl: String
fileMimeType: String
fileSize: Number
summary: String
metadata: Object
createdAt: Date
updatedAt: Date
```

### Relationships

```text
medical_records.patientId -> patients._id
medical_records.uploadedBy -> users._id
medical_records._id -> Qdrant patient_medical_context.payload.recordId
```

### Indexes

```text
patientId
uploadedBy
recordType
createdAt
patientId + recordType
```

### Validation Rules

- `patientId` is required.
- `uploadedBy` is required.
- `recordType` must match the allowed enum.
- `fileUrl` is required.
- `fileSize` must be greater than `0`.
- Only the patient, assigned doctor, or admin can access the record.
- Private files should be served through signed URLs, not public links.

## 9. rag_documents

Stores metadata for documents indexed into the general RAG knowledge base.

### Fields

```text
_id: ObjectId
title: String
sourceType: String enum(pdf, text, faq, policy, medical_article)
uploadedBy: ObjectId
status: String enum(processing, indexed, failed)
qdrantCollection: String
chunkCount: Number
errorMessage: String
metadata: Object
createdAt: Date
updatedAt: Date
```

### Relationships

```text
rag_documents.uploadedBy -> users._id
rag_documents._id -> Qdrant hospital_knowledge_base.payload.documentId
```

### Indexes

```text
uploadedBy
status
sourceType
createdAt
```

### Validation Rules

- `title` is required.
- `sourceType` must match the allowed enum.
- `uploadedBy` is required and should reference an admin user.
- `status` must match the allowed enum.
- New documents should start as `processing`.
- `chunkCount` must be greater than or equal to `0`.
- Failed documents should include `errorMessage`.

## 10. chat_sessions

Stores chatbot conversations.

### Fields

```text
_id: ObjectId
userId: ObjectId
role: String enum(patient, doctor, admin)
title: String
createdAt: Date
updatedAt: Date
```

### Relationships

```text
chat_sessions.userId -> users._id
chat_sessions._id -> chat_messages.sessionId
```

### Indexes

```text
userId
role
updatedAt
```

### Validation Rules

- `userId` is required.
- `role` must match the user's role at session creation.
- `title` should be generated or provided.
- Users can access only their own sessions unless an admin audit workflow allows otherwise.

## 11. chat_messages

Stores user, assistant, and system messages for chatbot sessions.

### Fields

```text
_id: ObjectId
sessionId: ObjectId
userId: ObjectId
sender: String enum(user, assistant, system)
message: String
sources:
  documentId: ObjectId
  title: String
  chunkId: String
  score: Number
metadata:
  model: String
  tokenUsage: Object
  ragUsed: Boolean
createdAt: Date
```

### Relationships

```text
chat_messages.sessionId -> chat_sessions._id
chat_messages.userId -> users._id
chat_messages.sources.documentId -> rag_documents._id
```

### Indexes

```text
sessionId
userId
createdAt
sessionId + createdAt
```

### Validation Rules

- `sessionId` is required.
- `userId` is required.
- `sender` must match the allowed enum.
- `message` is required.
- Assistant messages should store sources when RAG is used.
- Messages must not expose unauthorized patient data.

## 12. audit_logs

Stores immutable audit events for sensitive operations.

### Fields

```text
_id: ObjectId
actorId: ObjectId
actorRole: String enum(patient, doctor, admin, system)
action: String
resourceType: String
resourceId: ObjectId
ipAddress: String
userAgent: String
metadata: Object
createdAt: Date
```

### Relationships

```text
audit_logs.actorId -> users._id
audit_logs.resourceId -> referenced resource depending on resourceType
```

### Indexes

```text
actorId
actorRole
action
resourceType
resourceId
createdAt
resourceType + resourceId
```

### Validation Rules

- `actorRole` must match the allowed enum.
- `action` is required.
- `resourceType` is required for resource-specific events.
- Audit logs should be append-only.
- Sensitive metadata should be redacted.

## 13. notifications

Stores in-app notification records and delivery status.

### Fields

```text
_id: ObjectId
userId: ObjectId
type: String enum(appointment, payment, refund, prescription, system)
title: String
message: String
status: String enum(unread, read)
delivery:
  email: String enum(not_sent, sent, failed)
  sms: String enum(not_sent, sent, failed)
  push: String enum(not_sent, sent, failed)
metadata: Object
createdAt: Date
updatedAt: Date
```

### Relationships

```text
notifications.userId -> users._id
```

### Indexes

```text
userId
status
type
createdAt
userId + status
```

### Validation Rules

- `userId` is required.
- `type` must match the allowed enum.
- `title` and `message` are required.
- `status` must be `unread` or `read`.

## Qdrant Vector Collections

## 1. hospital_knowledge_base

Stores embeddings for general RAG documents such as hospital policies, FAQs, and approved medical education content.

### Vector

```text
vector: Gemini embedding vector
```

### Payload

```text
documentId: String
chunkId: String
title: String
chunkText: String
sourceType: String
category: String
tags: [String]
uploadedBy: String
createdAt: String
```

### Relationships

```text
payload.documentId -> rag_documents._id
payload.uploadedBy -> users._id
```

### Payload Indexes

```text
documentId
sourceType
category
tags
createdAt
```

### Validation Rules

- `documentId` is required.
- `chunkId` is required and should be unique per document.
- `chunkText` is required.
- `sourceType` should match the source document type.
- Only approved admin-managed content should be indexed here.
- Do not store patient-specific medical data in this collection.

## 2. patient_medical_context

Optional sensitive vector collection for patient-specific records.

### Vector

```text
vector: Gemini embedding vector
```

### Payload

```text
patientId: String
recordId: String
recordType: String
chunkId: String
chunkText: String
accessScope: String enum(patient, assigned_doctor, admin)
createdAt: String
```

### Relationships

```text
payload.patientId -> patients._id
payload.recordId -> medical_records._id
```

### Payload Indexes

```text
patientId
recordId
recordType
accessScope
createdAt
```

### Validation Rules

- `patientId` is required.
- `recordId` is required.
- `chunkText` is required.
- Patient-specific vectors must be queried only after authorization.
- Patients can query only their own vectors.
- Doctors can query patient vectors only when linked to the patient by appointment or care assignment.
- Admin access must be audited.
- Sensitive data should not be copied into the general knowledge base.

## Cross-Collection Relationship Summary

```text
users 1 -> 1 patients
users 1 -> 1 doctors
users 1 -> many chat_sessions
users 1 -> many audit_logs

patients 1 -> many appointments
patients 1 -> many payments
patients 1 -> many medical_records
patients 1 -> many prescriptions

doctors 1 -> many appointments
doctors 1 -> many payments
doctors 1 -> many prescriptions

appointments 1 -> 1 payments
appointments 1 -> 0..1 prescriptions
appointments 1 -> 0..many refunds

payments 1 -> 0..many refunds

rag_documents 1 -> many Qdrant hospital_knowledge_base points
medical_records 1 -> many Qdrant patient_medical_context points
```

## State Transition Rules

### Appointment Status

```text
pending -> confirmed
pending -> cancelled
confirmed -> completed
confirmed -> cancelled
cancelled -> refunded
```

Invalid transitions:

- `completed -> cancelled`
- `refunded -> confirmed`
- `cancelled -> completed`

### Payment Status

```text
created -> paid
created -> failed
paid -> partially_refunded
paid -> refunded
partially_refunded -> refunded
```

Validation:

- `paid` requires verified Razorpay signature.
- Refund status must align with total completed refund amount.

### Refund Status

```text
requested -> approved
requested -> rejected
approved -> processing
processing -> completed
processing -> failed
```

Validation:

- Only admins can move `requested` to `approved` or `rejected`.
- Only approved refunds can be sent to Razorpay.

### RAG Document Status

```text
processing -> indexed
processing -> failed
failed -> processing
indexed -> processing
```

Validation:

- `indexed` requires at least one Qdrant point unless the document is intentionally empty.
- `failed` should include an error message.

