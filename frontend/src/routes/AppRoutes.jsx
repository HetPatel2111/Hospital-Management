import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ROUTES } from "../constants/routes.js";
import { ProtectedRoute, PublicRoute, RoleRoute } from "./ProtectedRoute.jsx";
import DashboardLayout from "../layouts/DashboardLayout.jsx";

// Import Auth Feature Pages
import Login from "../features/auth/Login.jsx";
import Register from "../features/auth/Register.jsx";
import ForgotPassword from "../features/auth/ForgotPassword.jsx";
import ResetPassword from "../features/auth/ResetPassword.jsx";
import Unauthorized from "../pages/Unauthorized.jsx";

// Import Patient Portal Pages
import PatientDashboard from "../features/patient/PatientDashboard.jsx";
import PatientProfile from "../features/patient/PatientProfile.jsx";
import PatientAppointments from "../features/patient/PatientAppointments.jsx";
import DoctorDetail from "../features/patient/DoctorDetail.jsx";

// General Placeholder Component for Dashboard pages (to avoid creating final pages in this phase)
const DashboardPlaceholder = ({ title, description }) => (
  <div className="p-8 rounded-2xl border border-white/5 bg-slate-900/40 backdrop-blur-md shadow-xl max-w-2xl">
    <div className="flex items-center gap-3.5 mb-4">
      <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 animate-pulse">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.467 5.99 5.99 0 0 0-1.925 3.546 5.974 5.974 0 0 1-2.133-1A3.75 3.75 0 0 0 12 18Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 0 0 .495-7.467 5.99 5.99 0 0 0-1.925 3.546 5.974 5.974 0 0 1-2.133-1A3.75 3.75 0 0 0 12 18ZM12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM12.75 6a.75.75 0 0 0-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 0 0 0-1.5h-3.75V6Z" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-slate-100 tracking-wide">{title}</h2>
    </div>
    <p className="text-slate-400 text-sm leading-relaxed mb-4">{description || "This component will be fully implemented in the subsequent phases."}</p>
    <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-lg">
      <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-ping"></span>
      Phase 7 Target Feature
    </div>
  </div>
);

export default function AppRoutes() {
  return (
    <Routes>
      {/* Root Path Direct Redirect */}
      <Route path="/" element={<Navigate to={ROUTES.LOGIN} replace />} />

      {/* Guest Only Routes */}
      <Route element={<PublicRoute />}>
        <Route path={ROUTES.LOGIN} element={<Login />} />
        <Route path={ROUTES.REGISTER} element={<Register />} />
        <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />
        <Route path={ROUTES.RESET_PASSWORD} element={<ResetPassword />} />
      </Route>

      {/* Unauthorized Access Route */}
      <Route path={ROUTES.UNAUTHORIZED} element={<Unauthorized />} />

      {/* Protected Routes Wrapper */}
      <Route element={<ProtectedRoute />}>
        
        {/* Patient Dashboard Module Routes */}
        <Route element={<RoleRoute allowedRoles={["patient"]} />}>
          <Route element={<DashboardLayout />}>
            <Route path={ROUTES.PATIENT_DASHBOARD} element={<PatientDashboard />} />
            <Route path={ROUTES.PATIENT_PROFILE} element={<PatientProfile />} />
            <Route path={ROUTES.PATIENT_APPOINTMENTS} element={<PatientAppointments />} />
            <Route path={ROUTES.PATIENT_DOCTOR_DETAILS} element={<DoctorDetail />} />
            <Route path={ROUTES.PATIENT_RECORDS} element={<DashboardPlaceholder title="Patient Medical Records" description="List all prescriptions, laboratory test results, and notes assigned by doctors." />} />
            <Route path={ROUTES.PATIENT_PAYMENTS} element={<DashboardPlaceholder title="Patient Payments Log" description="Review invoices, pending transaction amounts, and complete payments." />} />
            <Route path={ROUTES.PATIENT_REFUNDS} element={<DashboardPlaceholder title="Patient Refunds Log" description="Check current status of payment returns and claim cancellations." />} />
          </Route>
        </Route>

        {/* Doctor Dashboard Module Routes */}
        <Route element={<RoleRoute allowedRoles={["doctor"]} />}>
          <Route element={<DashboardLayout />}>
            <Route path={ROUTES.DOCTOR_DASHBOARD} element={<DashboardPlaceholder title="Doctor Dashboard" description="Check today's patient queue, total workload metrics, and availability reminders." />} />
            <Route path={ROUTES.DOCTOR_PROFILE} element={<DashboardPlaceholder title="Doctor Profile Settings" description="Edit consultation fees, academic qualifications, and profile biography." />} />
            <Route path={ROUTES.DOCTOR_AVAILABILITY} element={<DashboardPlaceholder title="Doctor Shift Availability" description="Configure weekly schedules, active hours, and holiday exceptions." />} />
            <Route path={ROUTES.DOCTOR_APPOINTMENTS} element={<DashboardPlaceholder title="Doctor Appointments Queue" description="Confirm incoming requests, start patient consults, or mark appointments as completed." />} />
            <Route path={ROUTES.DOCTOR_PATIENTS} element={<DashboardPlaceholder title="Doctor Patients Database" description="View past histories, treatments, and medical records of assigned patients." />} />
            <Route path={ROUTES.DOCTOR_PATIENT_DETAILS} element={<DashboardPlaceholder title="Patient Profile Timeline" />} />
          </Route>
        </Route>

        {/* Admin Dashboard Module Routes */}
        <Route element={<RoleRoute allowedRoles={["admin"]} />}>
          <Route element={<DashboardLayout />}>
            <Route path={ROUTES.ADMIN_DASHBOARD} element={<DashboardPlaceholder title="Admin System Overview" description="Aggregate hospital KPIs, active doctor ratios, and server health charts." />} />
            <Route path={ROUTES.ADMIN_USERS} element={<DashboardPlaceholder title="User Account Control" description="Verify user statuses, toggle account suspensions, or update credentials." />} />
            <Route path={ROUTES.ADMIN_DOCTORS} element={<DashboardPlaceholder title="Doctor Registration Approvals" description="Review certificates, approve new practitioner requests, and list registered doctors." />} />
            <Route path={ROUTES.ADMIN_APPOINTMENTS} element={<DashboardPlaceholder title="All Appointments Ledger" description="Monitor scheduling distributions, force cancellations, or change statuses." />} />
            <Route path={ROUTES.ADMIN_PAYMENTS} element={<DashboardPlaceholder title="All Payments Ledger" description="Track transactions, view total revenue collections, and manage billing entries." />} />
            <Route path={ROUTES.ADMIN_REFUNDS} element={<DashboardPlaceholder title="Admin Refund Approvals" description="Process patient cancellation claims and trigger balance paybacks." />} />
            <Route path={ROUTES.ADMIN_AUDIT_LOGS} element={<DashboardPlaceholder title="Security Audit Logs" description="Review user session traces, database edits, and access histories." />} />
            <Route path={ROUTES.ADMIN_RAG} element={<DashboardPlaceholder title="AI RAG Knowledge Base" description="Upload document files to update the AI chatbot's vector dataset storage." />} />
          </Route>
        </Route>

      </Route>

      {/* Catch-all Fallback */}
      <Route path="*" element={<Navigate to={ROUTES.LOGIN} replace />} />
    </Routes>
  );
}
