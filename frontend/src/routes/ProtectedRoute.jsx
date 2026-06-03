import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { ROUTES } from "../constants/routes.js";

// Spinner component matching rich HSL styling guidelines
export const LoadingScreen = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100">
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 rounded-full border-4 border-sky-500/20"></div>
      <div className="absolute inset-0 rounded-full border-4 border-t-sky-500 animate-spin"></div>
    </div>
    <span className="mt-4 text-sm text-slate-400 font-medium tracking-wide">Loading AI Hospital System...</span>
  </div>
);

// ProtectedRoute: Authenticated users only
export const ProtectedRoute = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return isAuthenticated ? <Outlet /> : <Navigate to={ROUTES.LOGIN} replace />;
};

// RoleRoute: Authenticated users with specific roles only
export const RoleRoute = ({ allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  const hasAllowedRole = allowedRoles.includes(user?.role);
  return hasAllowedRole ? <Outlet /> : <Navigate to={ROUTES.UNAUTHORIZED} replace />;
};

// PublicRoute: Unauthenticated users only (Login, Register, etc.)
export const PublicRoute = () => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    // Redirect based on role
    if (user?.role === "patient") {
      return <Navigate to={ROUTES.PATIENT_DASHBOARD} replace />;
    }
    if (user?.role === "doctor") {
      return <Navigate to={ROUTES.DOCTOR_DASHBOARD} replace />;
    }
    if (user?.role === "admin") {
      return <Navigate to={ROUTES.ADMIN_DASHBOARD} replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
