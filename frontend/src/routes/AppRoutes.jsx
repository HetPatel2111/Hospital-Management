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
import PatientPayments from "../features/patient/PatientPayments.jsx";
import PatientRefunds from "../features/patient/PatientRefunds.jsx";

// Import Admin Portal Pages
import AdminDashboard from "../features/admin/AdminDashboard.jsx";
import AdminDoctors from "../features/admin/AdminDoctors.jsx";
import AdminPatients from "../features/admin/AdminPatients.jsx";
import AdminAppointments from "../features/admin/AdminAppointments.jsx";
import AdminPayments from "../features/admin/AdminPayments.jsx";
import AdminRefunds from "../features/admin/AdminRefunds.jsx";

// Import Doctor Portal Pages
import DoctorDashboard from "../features/doctor/DoctorDashboard.jsx";
import DoctorAppointments from "../features/doctor/DoctorAppointments.jsx";
import DoctorAvailability from "../features/doctor/DoctorAvailability.jsx";
import DoctorProfile from "../features/doctor/DoctorProfile.jsx";
import DoctorPatients from "../features/doctor/DoctorPatients.jsx";
import DoctorPatientDetails from "../features/doctor/DoctorPatientDetails.jsx";

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
            <Route path={ROUTES.PATIENT_PAYMENTS} element={<PatientPayments />} />
            <Route path={ROUTES.PATIENT_REFUNDS} element={<PatientRefunds />} />
          </Route>
        </Route>

        {/* Doctor Dashboard Module Routes */}
        <Route element={<RoleRoute allowedRoles={["doctor"]} />}>
          <Route element={<DashboardLayout />}>
            <Route path={ROUTES.DOCTOR_DASHBOARD} element={<DoctorDashboard />} />
            <Route path={ROUTES.DOCTOR_PROFILE} element={<DoctorProfile />} />
            <Route path={ROUTES.DOCTOR_AVAILABILITY} element={<DoctorAvailability />} />
            <Route path={ROUTES.DOCTOR_APPOINTMENTS} element={<DoctorAppointments />} />
            <Route path={ROUTES.DOCTOR_PATIENTS} element={<DoctorPatients />} />
            <Route path={ROUTES.DOCTOR_PATIENT_DETAILS} element={<DoctorPatientDetails />} />
          </Route>
        </Route>

        {/* Admin Dashboard Module Routes */}
        <Route element={<RoleRoute allowedRoles={["admin"]} />}>
          <Route element={<DashboardLayout />}>
            <Route path={ROUTES.ADMIN_DASHBOARD} element={<AdminDashboard />} />
            <Route path={ROUTES.ADMIN_USERS} element={<AdminPatients />} />
            <Route path={ROUTES.ADMIN_DOCTORS} element={<AdminDoctors />} />
            <Route path={ROUTES.ADMIN_APPOINTMENTS} element={<AdminAppointments />} />
            <Route path={ROUTES.ADMIN_PAYMENTS} element={<AdminPayments />} />
            <Route path={ROUTES.ADMIN_REFUNDS} element={<AdminRefunds />} />
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
