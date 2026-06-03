import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getMyAppointments,
  confirmAppointment,
  cancelAppointment,
  completeAppointment,
  createPrescription
} from "../../services/doctorService.js";
import { THEME } from "../../theme/index.js";
import { ListItemSkeleton } from "../../components/Skeletons.jsx";
import EmptyState from "../../components/EmptyState.jsx";

export default function DoctorAppointments() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState(""); // "" | "pending" | "confirmed" | "completed" | "cancelled"
  
  // Modals / Input states
  const [cancellationId, setCancellationId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [prescriptionAppt, setPrescriptionAppt] = useState(null); // appointment model for prescription modal
  const [diagnosis, setDiagnosis] = useState("");
  const [medicines, setMedicines] = useState([{ name: "", dosage: "", frequency: "", duration: "" }]);
  const [notes, setNotes] = useState("");

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch appointments query
  const { data, isLoading, error } = useQuery({
    queryKey: ["doctorAppointments", { page: currentPage, status: statusFilter }],
    queryFn: () => getMyAppointments({ page: currentPage, limit: 8, status: statusFilter })
  });

  const appointmentsList = data?.data?.appointments || [];
  const pagination = data?.data?.pagination || { total: 0, totalPages: 1 };

  // Mutations
  const actionMutation = useMutation({
    mutationFn: async ({ id, type, extra }) => {
      switch (type) {
        case "confirm":
          return confirmAppointment(id);
        case "cancel":
          return cancelAppointment(id, extra);
        case "complete":
          return completeAppointment(id);
        case "prescription":
          return createPrescription(extra);
        default:
          throw new Error("Invalid action type");
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(["doctorAppointments"]);
      queryClient.invalidateQueries(["doctorPatients"]);
      
      setCancellationId(null);
      setCancelReason("");
      setPrescriptionAppt(null);
      setDiagnosis("");
      setMedicines([{ name: "", dosage: "", frequency: "", duration: "" }]);
      setNotes("");
      
      const successLabels = {
        confirm: "Appointment confirmed successfully!",
        cancel: "Appointment cancelled successfully.",
        complete: "Appointment marked completed!",
        prescription: "Prescription submitted and logged!"
      };
      
      setSuccessMessage(successLabels[variables.type]);
      setTimeout(() => setSuccessMessage(""), 4000);
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || "Failed to update appointment state.");
      setTimeout(() => setErrorMessage(""), 4500);
    }
  });

  const handleAction = (id, type) => {
    if (type === "confirm") {
      if (window.confirm("Do you want to confirm this patient booking?")) {
        actionMutation.mutate({ id, type });
      }
    } else if (type === "complete") {
      if (window.confirm("Mark this consultation as complete?")) {
        actionMutation.mutate({ id, type });
      }
    }
  };

  const handleCancelSubmit = (e) => {
    e.preventDefault();
    if (!cancellationId || !cancelReason.trim()) return;
    actionMutation.mutate({ id: cancellationId, type: "cancel", extra: cancelReason });
  };

  const handlePrescriptionSubmit = (e) => {
    e.preventDefault();
    if (!prescriptionAppt || !diagnosis.trim()) return;

    const formattedMedicines = medicines.filter(m => m.name.trim());
    if (formattedMedicines.length === 0) {
      setErrorMessage("Please prescribe at least one medicine item.");
      return;
    }

    actionMutation.mutate({
      id: prescriptionAppt._id,
      type: "prescription",
      extra: {
        appointmentId: prescriptionAppt._id,
        patientId: prescriptionAppt.patientId?._id,
        diagnosis,
        medicines: formattedMedicines,
        notes
      }
    });
  };

  const addMedicineRow = () => {
    setMedicines([...medicines, { name: "", dosage: "", frequency: "", duration: "" }]);
  };

  const handleMedicineChange = (index, field, value) => {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
  };

  const removeMedicineRow = (index) => {
    const updated = medicines.filter((_, i) => i !== index);
    setMedicines(updated.length ? updated : [{ name: "", dosage: "", frequency: "", duration: "" }]);
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
        <h1 className="text-2xl md:text-3xl font-bold text-slate-50 tracking-tight">Appointments Queue</h1>
        <p className="text-sm text-slate-400 mt-1">Review scheduled slots, confirm pending visits, cancel reservations, or prescribe medication.</p>
      </div>

      {/* Filter and Messages */}
      <div className="flex justify-between items-center bg-slate-900/20 p-4 rounded-2xl border border-white/5">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filter Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className={`px-3 py-1.5 text-xs font-semibold ${THEME.glass.input} border-white/10`}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

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

      {/* Queue list */}
      {isLoading ? (
        <div className="space-y-4">
          <ListItemSkeleton />
          <ListItemSkeleton />
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          Failed to fetch appointments queue records.
        </div>
      ) : appointmentsList.length === 0 ? (
        <EmptyState
          title="No Appointments Found"
          description="There are no consultation sessions matching your current status filter."
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
                    <th className="py-4 px-6">Date & Slot Time</th>
                    <th className="py-4 px-6">Reason for Visit</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-center">Consultation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                  {appointmentsList.map((appt) => {
                    const patName = appt.patientId?.userId?.name || "Patient";
                    const patEmail = appt.patientId?.userId?.email || "";
                    
                    const scheduleDate = appt.appointmentDate
                      ? new Date(appt.appointmentDate).toLocaleDateString(undefined, {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric"
                        })
                      : "N/A";

                    return (
                      <tr key={appt._id} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-6">
                          <p className="font-bold text-slate-100">{patName}</p>
                          <p className="text-[10px] text-slate-500">{patEmail}</p>
                        </td>
                        <td className="py-4 px-6 font-medium">
                          <p className="text-slate-200">{scheduleDate}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {appt.startTime} - {appt.endTime}
                          </p>
                        </td>
                        <td className="py-4 px-6 max-w-[200px] truncate" title={appt.reason}>
                          {appt.reason}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-block text-[9px] font-bold border px-2.5 py-0.5 rounded-full uppercase ${getStatusBadge(appt.status)}`}>
                            {appt.status}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex gap-2 justify-center">
                            {appt.status === "pending" && (
                              <>
                                <button
                                  onClick={() => handleAction(appt._id, "confirm")}
                                  className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 transition-all"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => { setCancellationId(appt._id); setErrorMessage(""); }}
                                  className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                                >
                                  Cancel
                                </button>
                              </>
                            )}

                            {appt.status === "confirmed" && (
                              <>
                                <button
                                  onClick={() => { setPrescriptionAppt(appt); setErrorMessage(""); }}
                                  className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 transition-all"
                                >
                                  Prescribe & Complete
                                </button>
                                <button
                                  onClick={() => { setCancellationId(appt._id); setErrorMessage(""); }}
                                  className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                                >
                                  Cancel
                                </button>
                              </>
                            )}

                            {appt.status === "completed" && (
                              <span className="text-[10px] text-slate-500 font-semibold italic">Consult Completed</span>
                            )}
                            {appt.status === "cancelled" && (
                              <span className="text-[10px] text-slate-500 font-semibold italic">Cancelled</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
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

      {/* CANCELLATION DIALOG MODAL */}
      {cancellationId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setCancellationId(null)}></div>
          <div className={`w-full max-w-md p-6 relative z-10 ${THEME.glass.card} border border-white/10`}>
            <h3 className="font-bold text-slate-100 text-md mb-2">Cancel Appointment</h3>
            <p className="text-xs text-slate-400 mb-4">Please detail the cancellation reason. The patient will be notified automatically.</p>

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Cancellation Reason
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className={`w-full px-4 py-3 text-xs ${THEME.glass.input} resize-none`}
                  rows="3"
                  placeholder="e.g. Schedule conflict, doctor is unavailable due to medical emergency..."
                  required
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setCancellationId(null)}
                  className="flex-1 py-2.5 bg-white/5 border border-white/10 text-slate-300 text-xs font-semibold uppercase tracking-wider rounded-xl hover:bg-white/10 transition-colors"
                >
                  Go Back
                </button>
                <button
                  type="submit"
                  disabled={actionMutation.isPending}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                >
                  {actionMutation.isPending ? "Submitting..." : "Confirm Cancellation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRESCRIPTION & COMPLETE DIALOG MODAL */}
      {prescriptionAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setPrescriptionAppt(null)}></div>
          <div className={`w-full max-w-xl p-6 relative z-10 my-8 ${THEME.glass.card} border border-white/10 max-h-[85vh] overflow-y-auto`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-slate-100 text-md">Write Medical Prescription</h3>
                <p className="text-xs text-slate-400 mt-1">Patient: {prescriptionAppt.patientId?.userId?.name || "Patient"}</p>
              </div>
              <button onClick={() => setPrescriptionAppt(null)} className="text-slate-400 hover:text-slate-200">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handlePrescriptionSubmit} className="space-y-5 text-xs text-slate-300">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Diagnosis / Assessment
                </label>
                <input
                  type="text"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  className={`w-full px-4 py-2.5 text-xs ${THEME.glass.input}`}
                  placeholder="e.g. Acute Bacterial Bronchitis, Migraine headache..."
                  required
                />
              </div>

              {/* Prescribed Medicines dynamic fields */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Medicines & Dosage Instructions
                  </label>
                  <button
                    type="button"
                    onClick={addMedicineRow}
                    className="text-[10px] font-bold text-sky-400 hover:underline"
                  >
                    + Add Medicine Row
                  </button>
                </div>

                <div className="space-y-3">
                  {medicines.map((med, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-2.5 items-end bg-white/5 p-3 rounded-xl border border-white/5 relative">
                      <div className="flex-1 w-full">
                        <label className="block text-[10px] text-slate-500 mb-1">Medicine Name</label>
                        <input
                          type="text"
                          value={med.name}
                          onChange={(e) => handleMedicineChange(index, "name", e.target.value)}
                          placeholder="e.g. Amoxicillin 500mg"
                          className={`w-full px-3 py-2 text-xs ${THEME.glass.input}`}
                          required
                        />
                      </div>
                      <div className="w-full sm:w-28">
                        <label className="block text-[10px] text-slate-500 mb-1">Dosage</label>
                        <input
                          type="text"
                          value={med.dosage}
                          onChange={(e) => handleMedicineChange(index, "dosage", e.target.value)}
                          placeholder="e.g. 1 capsule"
                          className={`w-full px-3 py-2 text-xs ${THEME.glass.input}`}
                          required
                        />
                      </div>
                      <div className="w-full sm:w-28">
                        <label className="block text-[10px] text-slate-500 mb-1">Frequency</label>
                        <input
                          type="text"
                          value={med.frequency}
                          onChange={(e) => handleMedicineChange(index, "frequency", e.target.value)}
                          placeholder="e.g. 3 times daily"
                          className={`w-full px-3 py-2 text-xs ${THEME.glass.input}`}
                          required
                        />
                      </div>
                      <div className="w-full sm:w-28">
                        <label className="block text-[10px] text-slate-500 mb-1">Duration</label>
                        <input
                          type="text"
                          value={med.duration}
                          onChange={(e) => handleMedicineChange(index, "duration", e.target.value)}
                          placeholder="e.g. 7 days"
                          className={`w-full px-3 py-2 text-xs ${THEME.glass.input}`}
                          required
                        />
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => removeMedicineRow(index)}
                        className="py-2 px-2.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 flex-shrink-0 mb-0.5"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Special Notes / Directions
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`w-full px-4 py-3 text-xs ${THEME.glass.input} resize-none`}
                  rows="3"
                  placeholder="e.g. Drink plenty of warm water. Rest for 3 days. Take medication after meals..."
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setPrescriptionAppt(null)}
                  className="flex-1 py-2.5 bg-white/5 border border-white/10 text-slate-300 text-xs font-semibold uppercase tracking-wider rounded-xl hover:bg-white/10 transition-colors"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  disabled={actionMutation.isPending}
                  className="flex-1 py-2.5 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                >
                  {actionMutation.isPending ? "Saving..." : "Log & Complete Consultation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
