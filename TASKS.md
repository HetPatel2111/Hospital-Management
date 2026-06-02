# AI Hospital Management System - Implementation Tasks

## Phase 1 - Foundation

- Initialize frontend with React, Vite, Tailwind CSS, React Router, and React Query.
- Initialize backend with Node.js and Express.js.
- Configure MongoDB Atlas connection.
- Configure environment variable management.
- Add centralized backend error handling.
- Add request validation strategy.
- Add API response standardization.
- Add logging and audit log foundation.

## Phase 2 - Authentication and Authorization

- Implement patient, doctor, and admin registration rules.
- Implement login and token refresh.
- Add password hashing.
- Add role-based access control.
- Add protected route middleware.
- Add frontend auth provider.
- Add role-aware route guards.
- Add optional MFA design for doctors and admins.

## Phase 3 - Patient Portal

- Build patient profile management.
- Build medical history management.
- Build medical record upload and viewing.
- Build patient appointment list.
- Build patient payment history.
- Build patient refund history.
- Build patient dashboard summary.

## Phase 4 - Doctor Portal

- Build doctor profile management.
- Build doctor availability management.
- Build appointment schedule.
- Build patient detail view for assigned patients.
- Build prescription creation.
- Build appointment completion flow.
- Build doctor dashboard analytics.

## Phase 5 - Admin Portal

- Build admin user management.
- Build doctor approval workflow.
- Build appointment monitoring.
- Build payment monitoring.
- Build refund review workflow.
- Build audit log view.
- Build RAG document management.
- Build admin analytics dashboard.

## Phase 6 - Appointment Booking

- Build doctor discovery and filtering.
- Build availability lookup.
- Build appointment slot reservation.
- Prevent double booking at database level.
- Create pending appointment before payment.
- Confirm appointment only after verified payment.
- Add cancellation and rescheduling rules.
- Add appointment reminders through background jobs.

## Phase 7 - Razorpay Payments

- Create Razorpay order API.
- Implement payment verification API.
- Implement Razorpay webhook endpoint.
- Store payment lifecycle events.
- Add payment reconciliation job.
- Add idempotency handling.
- Add frontend Razorpay checkout integration.

## Phase 8 - Refund System

- Implement refund request creation.
- Implement refund eligibility rules.
- Implement admin approval and rejection.
- Implement Razorpay refund processing.
- Track refund status.
- Add refund reconciliation job.
- Add refund audit logs.

## Phase 9 - RAG System

- Build RAG document upload.
- Parse uploaded documents.
- Chunk document text.
- Generate embeddings with Gemini.
- Store embeddings in Qdrant.
- Track indexing status in MongoDB.
- Add RAG query endpoint.
- Return source citations with chatbot responses.

## Phase 10 - AI Chatbot

- Build chat sessions and message history.
- Add role-aware chatbot permissions.
- Add RAG retrieval before Gemini response generation.
- Add medical safety system prompts.
- Add prompt injection filtering.
- Add source-grounded responses.
- Add AI usage logging.
- Add frontend chatbot interface.

## Phase 11 - Analytics

- Build admin overview metrics.
- Build revenue analytics.
- Build appointment analytics.
- Build doctor performance analytics.
- Build patient dashboard metrics.
- Add analytics aggregation queries.
- Add optional scheduled pre-aggregation jobs.

## Phase 12 - Security Hardening

- Add CORS allowlist.
- Add Helmet security headers.
- Add request size limits.
- Add rate limiting.
- Add secure cookie strategy if cookies are used.
- Add secret management.
- Add private file access through signed URLs.
- Add medical record access auditing.
- Add vulnerability scanning in CI.

## Phase 13 - Testing

- Add unit tests for services.
- Add integration tests for APIs.
- Add auth and authorization tests.
- Add payment verification tests.
- Add refund workflow tests.
- Add RAG indexing tests.
- Add chatbot permission tests.
- Add frontend component and flow tests.

## Phase 14 - Deployment

- Prepare frontend deployment pipeline.
- Prepare backend deployment pipeline.
- Configure production MongoDB Atlas.
- Configure production Qdrant.
- Configure Razorpay live credentials.
- Configure Gemini production key.
- Configure monitoring and logging.
- Configure staging environment.
- Run production readiness checklist.

## Production Readiness Checklist

- Authentication is complete.
- Authorization is enforced on every protected route.
- Payment signatures are verified server-side.
- Razorpay webhooks are verified.
- Refund actions are admin-authorized and audited.
- Appointment double booking is prevented.
- Patient medical records are protected.
- AI does not expose unauthorized patient data.
- RAG responses include source grounding.
- Secrets are not committed.
- Logs avoid sensitive medical data.
- Monitoring and alerts are configured.
- Backups are configured for MongoDB Atlas.
- Deployment environments are isolated.

