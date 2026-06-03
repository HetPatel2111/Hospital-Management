import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listAllAppointments, updateAppointmentStatus } from "../../services/adminService.js";
import { THEME } from "../../theme/index.js";
import { ListItemSkeleton } from "../../components/Skeletons.jsx";
import EmptyState from "../../components/EmptyState.jsx";

export default function AdminAppointments() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // "" | "pending" | "confirmed" | "completed" | "cancelled" | "refunded"
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch appointments query
  const { data, isLoading, error } = useQuery({
    queryKey: ["adminAppointments", { page: currentPage, search: searchQuery, status: statusFilter }],
    queryFn: () => listAllAppointments({ page: currentPage, limit: 8, search: searchQuery, status: statusFilter })
  });

  const appointmentsList = data?.data?.appointments || [];
  const pagination = data?.data?.pagination || { total: 0, totalPages: 1 };

  // Status update mutation (e.g. Force Cancellation)
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      return updateAppointmentStatus(id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["adminAppointments"]);
      queryClient.invalidateQueries(["adminKPIs"]);
      setSuccessMessage("Appointment status updated successfully!");
      setTimeout(() => setSuccessMessage(""), 4000);
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || "Failed to update appointment status.");
      setTimeout(() => setErrorMessage(""), 4500);
    }
  });

  const handleCancelClick = (appointment) => {
    if (window.confirm(`Are you sure you want to cancel the appointment for patient "${appointment.patientId?.userId?.name || "Patient"}"?`)) {
      statusMutation.mutate({ id: appointment._id, status: "cancelled" });
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "cancelled":
      case "refunded":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "confirmed":
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
      case "pending_payment":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "pending":
      default:
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-50 tracking-tight">Appointments Ledger</h1>
        <p className="text-sm text-slate-400 mt-1">Audit all booked hospital visits, filter by statuses, search practitioners or patients, and cancel scheduled appointments.</p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search appointments by patient name or doctor name..."
            className={`w-full px-4 py-2.5 text-xs ${THEME.glass.input}`}
          />
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className={`px-3 py-2 text-xs font-semibold ${THEME.glass.input} border-white/10`}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="pending_payment">Pending Payment</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* Message Banners */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
          {errorMessage}
        </div>
      )}

      {/* Ledger Table */}
      {isLoading ? (
        <div className="space-y-4">
          <ListItemSkeleton />
          <ListItemSkeleton />
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          Failed to fetch appointments ledger database records.
        </div>
      ) : appointmentsList.length === 0 ? (
        <EmptyState
          title="No Appointments Logged"
          description="There are no system appointments matching your filters."
          iconType="appointments"
        />
      ) : (
        <div className="space-y-4">
          <div className={`${THEME.glass.card} overflow-hidden border border-white/5`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-900/20">
                    <th className="py-4 px-6">Patient details</th>
                    <th className="py-4 px-6">Assigned Doctor</th>
                    <th className="py-4 px-6">Consultation Schedule</th>
                    <th className="py-4 px-6">Reason / Symptoms</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                  {appointmentsList.map((appt) => {
                    const patientName = appt.patientId?.userId?.name || "Patient User";
                    const doctorName = appt.doctorId?.userId?.name || "Practitioner";
                    const specialization = appt.doctorId?.specialization || "General";
                    
                    // Format scheduled date
                    const scheduleDate = appt.appointmentDate
                      ? new Date(appt.appointmentDate).toLocaleDateString(undefined, {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric"
                        })
                      : "No Date";

                    return (
                      <tr key={appt._id} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-6">
                          <p className="font-bold text-slate-100">{patientName}</p>
                          <p className="text-[10px] text-slate-500">{appt.patientId?.userId?.email || ""}</p>
                        </td>
                        <td className="py-4 px-6">
                          <p className="font-semibold text-slate-200">Dr. {doctorName}</p>
                          <p className="text-[10px] text-sky-400">{specialization}</p>
                        </td>
                        <td className="py-4 px-6">
                          <p className="font-medium text-slate-200">{scheduleDate}</p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {appt.startTime} - {appt.endTime}
                          </p>
                        </td>
                        <td className="py-4 px-6 truncate max-w-[150px]" title={appt.reason}>
                          {appt.reason}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-block text-[9px] font-bold border px-2.5 py-0.5 rounded-full uppercase ${getStatusBadge(appt.status)}`}>
                            {appt.status}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex gap-2 justify-center">
                            {["pending", "confirmed", "pending_payment"].includes(appt.status) && (
                              <button
                                onClick={() => handleCancelClick(appt)}
                                className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                              >
                                Cancel Appt
                              </button>
                            )}
                            {!["pending", "confirmed", "pending_payment"].includes(appt.status) && (
                              <span className="text-[10px] text-slate-500 font-semibold italic">Locked</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-slate-900/20">
                <span className="text-xs text-slate-400">
                  Page <strong className="text-slate-200">{currentPage}</strong> of <strong className="text-slate-200">{pagination.totalPages}</strong> ({pagination.total} entries)
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-xs font-semibold transition-all disabled:opacity-30 disabled:hover:bg-white/5 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, pagination.totalPages))}
                    disabled={currentPage === pagination.totalPages}
                    className="px-3.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-xs font-semibold transition-all disabled:opacity-30 disabled:hover:bg-white/5 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
