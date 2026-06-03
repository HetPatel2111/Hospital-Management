import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyAppointments } from "../../services/doctorService.js";
import { THEME } from "../../theme/index.js";
import { CardSkeleton } from "../../components/Skeletons.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import { Link } from "react-router-dom";
import { ROUTES } from "../../constants/routes.js";

export default function DoctorDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["doctorAppointments"],
    queryFn: () => getMyAppointments({ limit: 100 })
  });

  const appointmentsList = data?.data?.appointments || [];
  
  // Calculate quick metrics
  const totalBookings = appointmentsList.length;
  const uniquePatients = new Set(appointmentsList.map(a => a.patientId?._id).filter(Boolean)).size;

  const todayStr = new Date().toISOString().split("T")[0];
  const todayAppointments = appointmentsList.filter(a => {
    if (!a.appointmentDate) return false;
    const aDate = new Date(a.appointmentDate).toISOString().split("T")[0];
    return aDate === todayStr;
  });

  const todayQueue = todayAppointments.length;
  const pendingRequests = appointmentsList.filter(a => a.status === "pending").length;

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-left">
        Failed to load dashboard metrics. Please check connection status.
      </div>
    );
  }

  // Get next 5 upcoming appointments
  const upcomingAppointments = appointmentsList
    .filter(a => ["confirmed", "pending"].includes(a.status))
    .slice(0, 5);

  return (
    <div className="space-y-8 text-left">
      {/* Welcome Banner */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-50 tracking-tight">Practitioner Portal</h1>
        <p className="text-sm text-slate-400 mt-1">Review today's patient queue, track appointment listings, and manage schedules.</p>
      </div>

      {/* KPI Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1 */}
          <div className={`${THEME.glass.card} p-5 flex items-center justify-between`}>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Visits</p>
              <h3 className="text-2xl font-extrabold text-slate-100 mt-1.5">{todayQueue}</h3>
              <p className="text-[10px] text-slate-500 mt-1">Appointments scheduled for today</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.5-1.619Z" />
              </svg>
            </div>
          </div>

          {/* Card 2 */}
          <div className={`${THEME.glass.card} p-5 flex items-center justify-between`}>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Patients</p>
              <h3 className="text-2xl font-extrabold text-slate-100 mt-1.5">{uniquePatients}</h3>
              <p className="text-[10px] text-slate-500 mt-1">Unique patients treated to date</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
            </div>
          </div>

          {/* Card 3 */}
          <div className={`${THEME.glass.card} p-5 flex items-center justify-between`}>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Bookings</p>
              <h3 className="text-2xl font-extrabold text-amber-400 mt-1.5">{pendingRequests}</h3>
              <p className="text-[10px] text-slate-500 mt-1">Pending doctor approval checks</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
          </div>

          {/* Card 4 */}
          <div className={`${THEME.glass.card} p-5 flex items-center justify-between`}>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Bookings</p>
              <h3 className="text-2xl font-extrabold text-slate-200 mt-1.5">{totalBookings}</h3>
              <p className="text-[10px] text-slate-500 mt-1">Overall consultations requested</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Today's Queue & Upcoming list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's appointments checklist */}
        <div className={`${THEME.glass.card} p-6 border border-white/5 lg:col-span-2 flex flex-col`}>
          <div>
            <h3 className="text-base font-bold text-slate-200">Today's Consultation Schedule</h3>
            <p className="text-xs text-slate-400 mt-1">Check symptom logs, diagnose, and prescribe for patients visiting today.</p>
          </div>

          <div className="mt-6 flex-1 space-y-3">
            {isLoading ? (
              <div className="text-xs text-slate-400 py-6">Loading today's queue...</div>
            ) : todayAppointments.length === 0 ? (
              <div className="py-12 border border-dashed border-white/5 rounded-xl flex flex-col items-center justify-center text-center">
                <p className="text-xs text-slate-400">You have no appointments scheduled for today.</p>
                <Link to={ROUTES.DOCTOR_APPOINTMENTS} className="text-xs text-sky-400 font-semibold hover:underline mt-2">View all appointments</Link>
              </div>
            ) : (
              todayAppointments.map(appt => {
                const patName = appt.patientId?.userId?.name || "Patient";
                const patEmail = appt.patientId?.userId?.email || "";
                
                return (
                  <div key={appt._id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-white/10 transition-colors">
                    <div>
                      <p className="text-xs font-bold text-slate-100">{patName}</p>
                      <p className="text-[10px] text-slate-500">{patEmail}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[9px] font-mono bg-slate-950/40 text-slate-400 px-2 py-0.5 rounded border border-white/5">
                          Time: {appt.startTime} - {appt.endTime}
                        </span>
                        <span className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.25 rounded border ${
                          appt.status === "confirmed" ? "bg-sky-500/10 text-sky-400 border-sky-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}>
                          {appt.status}
                        </span>
                      </div>
                    </div>
                    
                    <Link
                      to={ROUTES.DOCTOR_APPOINTMENTS}
                      className="px-3 py-1.5 rounded-lg bg-sky-500/15 border border-sky-500/30 hover:bg-sky-500/25 text-sky-400 text-xs font-bold tracking-wider uppercase transition-colors"
                    >
                      Start Consult
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Doctor availability & shift summary */}
        <div className={`${THEME.glass.card} p-6 border border-white/5 lg:col-span-1`}>
          <div>
            <h3 className="text-base font-bold text-slate-200">Upcoming Consultations</h3>
            <p className="text-xs text-slate-400 mt-1">Next scheduled appointments</p>
          </div>

          <div className="mt-6 space-y-4">
            {isLoading ? (
              <div className="h-4 bg-white/5 rounded w-full animate-pulse"></div>
            ) : upcomingAppointments.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 italic">No pending or confirmed appointments found.</p>
            ) : (
              upcomingAppointments.map((appt) => {
                const name = appt.patientId?.userId?.name || "Patient";
                const dateStr = appt.appointmentDate
                  ? new Date(appt.appointmentDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                  : "";
                
                return (
                  <div key={appt._id} className="pb-3 border-b border-white/5 last:border-0 last:pb-0 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-200">{name}</p>
                      <p className="text-[10px] text-slate-500">{dateStr} at {appt.startTime}</p>
                    </div>
                    <span className="text-[9px] font-mono uppercase bg-slate-900 px-2 py-0.5 rounded text-slate-400 border border-white/5">
                      {appt.status}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
