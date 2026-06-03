import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getDashboard, getNotifications, getAppointments } from "../../services/patientService.js";
import AppointmentCountdown from "../../components/AppointmentCountdown.jsx";
import { CardSkeleton, ListItemSkeleton } from "../../components/Skeletons.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import { THEME } from "../../theme/index.js";
import { ROUTES } from "../../constants/routes.js";

export default function PatientDashboard() {
  const navigate = useNavigate();

  // 1. Fetch dashboard metrics
  const { data: dashboardData, isLoading: metricsLoading } = useQuery({
    queryKey: ["patientDashboard"],
    queryFn: getDashboard,
  });

  // 2. Fetch upcoming appointments (for countdown widget & list)
  const { data: appointmentsData, isLoading: apptsLoading } = useQuery({
    queryKey: ["patientAppointments", "upcoming"],
    queryFn: () => getAppointments("upcoming", { limit: 5 }),
  });

  // 3. Fetch notifications
  const { data: notificationsData, isLoading: notesLoading } = useQuery({
    queryKey: ["patientNotifications", { limit: 5 }],
    queryFn: () => getNotifications({ limit: 5 }),
  });

  const stats = dashboardData?.data?.dashboard || {};
  const appointments = appointmentsData?.data?.appointments || [];
  const notifications = notificationsData?.data?.notifications || [];

  const isLoading = metricsLoading || apptsLoading || notesLoading;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-50 tracking-tight">Patient Portal</h1>
        <p className="text-sm text-slate-400 mt-1">Monitor your health records, consults, and booking actions</p>
      </div>

      {/* Countdown Widget */}
      {!isLoading && appointments.length > 0 && (
        <AppointmentCountdown appointments={appointments} />
      )}

      {/* KPI Stats Grid (Mobile First, Tablet, Desktop Responsive) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <div className={`p-5 ${THEME.glass.card} flex flex-col justify-between`}>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Profile Completion</span>
              <div className="flex items-end justify-between mt-3">
                <span className="text-3xl font-extrabold text-slate-100">{stats.profileCompletion}%</span>
                <span className="text-xs text-sky-400 font-semibold cursor-pointer hover:underline" onClick={() => navigate(ROUTES.PATIENT_PROFILE)}>Edit Profile</span>
              </div>
            </div>

            <div className={`p-5 ${THEME.glass.card} flex flex-col justify-between`}>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Upcoming Visits</span>
              <div className="flex items-end justify-between mt-3">
                <span className="text-3xl font-extrabold text-slate-100">{stats.upcomingAppointments}</span>
                <span className="text-xs text-sky-400 font-semibold cursor-pointer hover:underline" onClick={() => navigate(ROUTES.PATIENT_APPOINTMENTS)}>View All</span>
              </div>
            </div>

            <div className={`p-5 ${THEME.glass.card} flex flex-col justify-between`}>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Completed Visits</span>
              <div className="flex items-end justify-between mt-3">
                <span className="text-3xl font-extrabold text-slate-100">{stats.completedAppointments}</span>
                <span className="text-xs text-slate-500">History</span>
              </div>
            </div>

            <div className={`p-5 ${THEME.glass.card} flex flex-col justify-between`}>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Unread Alerts</span>
              <div className="flex items-end justify-between mt-3">
                <span className="text-3xl font-extrabold text-slate-100">{stats.unreadNotifications}</span>
                <span className="text-xs text-slate-500">Real-time</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Main Splits: Recent Appointments & Activity Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Appointments */}
        <div className={`lg:col-span-2 p-6 ${THEME.glass.card} h-fit`}>
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
            <h3 className="font-bold text-slate-100 text-md">Upcoming Appointments</h3>
            <button
              onClick={() => navigate(ROUTES.PATIENT_APPOINTMENTS)}
              className="text-xs text-sky-400 hover:text-sky-300 font-semibold transition-colors"
            >
              Book / Manage
            </button>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 2 }).map((_, i) => <ListItemSkeleton key={i} />)
            ) : appointments.length === 0 ? (
              <div className="py-6">
                <EmptyState
                  title="No Upcoming Consultations"
                  description="You do not have any pending or confirmed bookings at the moment."
                  iconType="appointments"
                  actionLabel="Book Appointment"
                  onActionClick={() => navigate(ROUTES.PATIENT_APPOINTMENTS)}
                />
              </div>
            ) : (
              appointments.slice(0, 3).map((appt) => (
                <div
                  key={appt.id}
                  className="p-4 rounded-xl border border-white/5 bg-slate-950/20 hover:bg-slate-900/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-sm">
                      {appt.doctor?.fullName?.charAt(0).toUpperCase() || "D"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{appt.doctor?.fullName || "Assigned Doctor"}</p>
                      <p className="text-xs text-sky-400">{appt.doctor?.specialization}</p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs font-semibold text-slate-300">
                      {new Date(appt.appointmentDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{appt.startTime} - {appt.endTime}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Recent Alerts / Notifications */}
        <div className={`p-6 ${THEME.glass.card} h-fit`}>
          <div className="border-b border-white/5 pb-4 mb-4">
            <h3 className="font-bold text-slate-100 text-md">Recent Alerts</h3>
          </div>

          <div className="space-y-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-start gap-3 p-3">
                  <div className="w-8 h-8 bg-slate-700/40 rounded-lg flex-shrink-0"></div>
                  <div className="space-y-1.5 w-full">
                    <div className="h-3.5 bg-slate-700/50 rounded w-full"></div>
                    <div className="h-2.5 bg-slate-700/30 rounded w-2/3"></div>
                  </div>
                </div>
              ))
            ) : notifications.length === 0 ? (
              <div className="py-6">
                <EmptyState
                  title="No Alerts Found"
                  description="Your inbox is clear! There are no alerts or messages to display."
                  iconType="notifications"
                />
              </div>
            ) : (
              notifications.map((note) => (
                <div key={note._id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    note.type === "prescription" 
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                      : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                  }`}>
                    {note.type === "prescription" ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-slate-200">{note.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{note.message}</p>
                    <span className="text-[8px] text-slate-500 block mt-1">
                      {new Date(note.createdAt).toLocaleDateString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
