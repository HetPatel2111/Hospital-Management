# AI Hospital Management System - Project Context

## Objective

Build a production-ready AI Hospital Management System that supports patients, doctors, administrators, appointments, payments, refunds, analytics, and AI-assisted hospital support through a RAG-enabled chatbot.

## Tech Stack

### Frontend

- React
- Vite
- Tailwind CSS
- React Router
- React Query

### Backend

- Node.js
- Express.js

### Database

- MongoDB Atlas

### Vector Database

- Qdrant

### AI

- Gemini

### Payments

- Razorpay

## Product Modules

### Patient Portal

- Patient registration and login
- Patient profile management
- Medical history and records
- Appointment booking
- Payment tracking
- Refund tracking
- AI chatbot access
- Prescription and report viewing

### Doctor Portal

- Doctor profile management
- Availability management
- Appointment schedule
- Patient history review
- Prescription management
- AI-assisted notes and summaries

### Admin Portal

- User management
- Doctor onboarding and approval
- Appointment oversight
- Payment and refund management
- RAG knowledge base management
- Dashboard analytics
- Audit log review

### AI Chatbot

- Hospital FAQ support
- Appointment guidance
- Report and policy explanation
- RAG-grounded responses
- Role-aware access to information

### RAG System

- Admin document upload
- Document parsing
- Text chunking
- Gemini embedding generation
- Qdrant vector indexing
- Source-grounded response generation

### Payments and Refunds

- Razorpay order creation
- Payment verification
- Webhook handling
- Refund request workflow
- Admin approval
- Razorpay refund processing
- Refund status tracking

## High-Level System Architecture

```text
React + Vite Frontend
        |
        | HTTPS
        v
Express.js Backend API
        |
        |-----------------------------|
        |                             |
 MongoDB Atlas                    Qdrant
 Operational Data                 RAG Vectors
        |                             |
        |                             |
 Razorpay                       Gemini
 Payments / Refunds             Chatbot / RAG / Summaries
```

## Recommended Backend Pattern

Use a modular monolith for the first production version.

This keeps the system simpler to deploy and operate while still enforcing clear business boundaries. The backend should be organized by modules such as auth, patients, doctors, appointments, payments, refunds, chatbot, RAG, analytics, and admin.

Future extraction candidates:

- AI and RAG service
- Payments service
- Notification service
- Analytics service

## Deployment Model

```text
User Browser
   |
   v
CDN / Static Hosting
React + Vite Frontend
   |
   v
HTTPS API
Node.js + Express Backend
   |
   |-----------------------------|
   v                             v
MongoDB Atlas                 Qdrant Cloud / Self-hosted Qdrant
   |
   v
Razorpay + Gemini APIs
```

## Production Infrastructure

- Static frontend hosting through Vercel, Netlify, AWS S3 + CloudFront, or Azure Static Web Apps
- Backend deployment through AWS ECS/Fargate, Render, Railway, DigitalOcean App Platform, or Azure App Service
- MongoDB Atlas for operational data
- Qdrant Cloud or self-hosted Qdrant for vector search
- Object storage for reports and uploaded files
- Background workers for async processing
- Centralized logging and monitoring

## Background Jobs

- RAG document indexing
- Appointment reminders
- Email and SMS notifications
- Refund reconciliation
- Analytics pre-aggregation
- Medical record summarization

## Environment Strategy

Maintain separate environments:

- development
- staging
- production

Each environment should use separate:

- MongoDB database
- Qdrant collection or cluster
- Razorpay test or live credentials
- Gemini API key
- Admin users
- Logging workspace
- Environment secrets

## Key Environment Variables

### Frontend

```text
VITE_API_BASE_URL
VITE_RAZORPAY_KEY_ID
```

### Backend

```text
NODE_ENV
PORT
MONGODB_URI
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
GEMINI_API_KEY
QDRANT_URL
QDRANT_API_KEY
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
FRONTEND_URL
```

