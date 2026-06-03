import React from "react";
import { THEME } from "../theme/index.js";

export default function AppointmentDetailsModal({ appointment, onClose, onCancelClick, onRescheduleClick }) {
  if (!appointment) return null;

  const getStatusBadge = (status) => {
    switch (status) {
      case "confirmed":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "completed":
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
      case "cancelled":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "refunded":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "pending":
      default:
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
  };

  const formattedDate = new Date(appointment.appointmentDate).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal Card */}
      <div className={`w-full max-w-lg p-6 relative z-10 ${THEME.glass.card} border border-white/10`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <span className={`text-[10px] uppercase font-bold border px-2 py-0.5 rounded-full ${getStatusBadge(appointment.status)}`}>
              {appointment.status}
            </span>
            <h3 className="font-bold text-slate-100 text-md">Appointment Details</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 hover:bg-white/5 rounded-lg transition-colors outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="space-y-5">
          {/* Doctor Details */}
          {appointment.doctor && (
            <div className="p-4 rounded-xl bg-slate-950/40 border border-white/5 flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
                {appointment.doctor.fullName?.charAt(0).toUpperCase() || "D"}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-100">{appointment.doctor.fullName}</h4>
                <p className="text-xs text-sky-400">{appointment.doctor.specialization}</p>
                <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">{appointment.doctor.qualification?.join(", ")}</p>
              </div>
            </div>
          )}

          {/* Date and Time Details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 text-left">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 block">Consultation Date</span>
              <p className="text-xs font-semibold text-slate-200 truncate">{formattedDate}</p>
            </div>
            <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 text-left">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 block">Time Slot</span>
              <p className="text-xs font-semibold text-slate-200">
                {appointment.startTime} - {appointment.endTime}
              </p>
            </div>
          </div>

          {/* Reason */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-left">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1 block">Patient Reason for Visit</span>
            <p className="text-xs font-medium text-slate-200 leading-relaxed">
              {appointment.reason || "No consultation reason provided."}
            </p>
          </div>

          {/* Doctor Notes (If complete) */}
          {appointment.notes && (
            <div className="p-4 rounded-xl bg-sky-500/5 border border-sky-500/10 text-left">
              <span className="text-[10px] uppercase font-bold tracking-wider text-sky-400 mb-1 block">Doctor Consultation Notes</span>
              <p className="text-xs font-medium text-slate-200 leading-relaxed">{appointment.notes}</p>
            </div>
          )}
        </div>

        {/* Footer Actions (Only for pending / confirmed appointments) */}
        {(appointment.status === "pending" || appointment.status === "confirmed") && (
          <div className="flex gap-3 border-t border-white/5 pt-5 mt-6">
            {onCancelClick && (
              <button
                onClick={() => {
                  onCancelClick(appointment);
                  onClose();
                }}
                className="flex-1 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-semibold rounded-xl text-xs tracking-wider uppercase transition-colors"
              >
                Cancel Appointment
              </button>
            )}
            {onRescheduleClick && (
              <button
                onClick={() => {
                  onRescheduleClick(appointment);
                  onClose();
                }}
                className="flex-1 py-2.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-sky-400 font-semibold rounded-xl text-xs tracking-wider uppercase transition-colors"
              >
                Reschedule
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
