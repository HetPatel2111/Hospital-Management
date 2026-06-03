export const ROUTES = {
  // Public
  LOGIN: "/login",
  REGISTER: "/register",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",
  UNAUTHORIZED: "/unauthorized",

  // Patient
  PATIENT_DASHBOARD: "/patient/dashboard",
  PATIENT_PROFILE: "/patient/profile",
  PATIENT_APPOINTMENTS: "/patient/appointments",
  PATIENT_DOCTOR_DETAILS: "/patient/doctors/:doctorId",
  PATIENT_RECORDS: "/patient/medical-records",
  PATIENT_PAYMENTS: "/patient/payments",
  PATIENT_REFUNDS: "/patient/refunds",

  // Doctor
  DOCTOR_DASHBOARD: "/doctor/dashboard",
  DOCTOR_PROFILE: "/doctor/profile",
  DOCTOR_AVAILABILITY: "/doctor/availability",
  DOCTOR_APPOINTMENTS: "/doctor/appointments",
  DOCTOR_PATIENTS: "/doctor/patients",
  DOCTOR_PATIENT_DETAILS: "/doctor/patients/:patientId",

  // Admin
  ADMIN_DASHBOARD: "/admin/dashboard",
  ADMIN_USERS: "/admin/users",
  ADMIN_DOCTORS: "/admin/doctors",
  ADMIN_APPOINTMENTS: "/admin/appointments",
  ADMIN_PAYMENTS: "/admin/payments",
  ADMIN_REFUNDS: "/admin/refunds",
  ADMIN_AUDIT_LOGS: "/admin/audit-logs",
  ADMIN_RAG: "/admin/rag-knowledge-base",
};
