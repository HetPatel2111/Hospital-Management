import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { ROUTES } from "../constants/routes.js";
import { THEME } from "../theme/index.js";

export default function Unauthorized() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleGoHome = () => {
    if (!user) {
      navigate(ROUTES.LOGIN);
    } else if (user.role === "patient") {
      navigate(ROUTES.PATIENT_DASHBOARD);
    } else if (user.role === "doctor") {
      navigate(ROUTES.DOCTOR_DASHBOARD);
    } else if (user.role === "admin") {
      navigate(ROUTES.ADMIN_DASHBOARD);
    } else {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

      <div className={`w-full max-w-md p-8 text-center ${THEME.glass.card} ${THEME.animations.slideUp} z-10`}>
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 mb-6 shadow-lg shadow-red-500/5 animate-pulse">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-9 h-9">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0-10.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286Zm0 13.036h.008v.008H12v-.008Z" />
          </svg>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-slate-50 mb-2">Access Denied</h1>
        <p className="text-slate-400 text-sm mb-8 max-w-xs mx-auto">
          You do not have the required permissions to access this page. Please contact your administrator if you believe this is in error.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleGoHome}
            className={`w-full py-3 ${THEME.glass.buttonPrimary}`}
          >
            Go to My Dashboard
          </button>
          
          {user && (
            <button
              onClick={logout}
              className={`w-full py-3 ${THEME.glass.buttonSecondary}`}
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
