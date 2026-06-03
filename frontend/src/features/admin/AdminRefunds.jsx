import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAdminRefunds, approveRefund, rejectRefund, processRefund } from "../../services/refundService.js";
import { THEME } from "../../theme/index.js";
import { ListItemSkeleton } from "../../components/Skeletons.jsx";
import EmptyState from "../../components/EmptyState.jsx";

export default function AdminRefunds() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  
  // Modal dialog states
  const [selectedRefund, setSelectedRefund] = useState(null); // refund model
  const [actionType, setActionType] = useState(null); // "approve" | "reject"
  const [adminRemarks, setAdminRemarks] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Fetch admin refunds
  const { data, isLoading, error } = useQuery({
    queryKey: ["adminRefunds", { page: currentPage, status: statusFilter }],
    queryFn: () => getAdminRefunds({ page: currentPage, limit: 8, status: statusFilter })
  });

  const refundsList = data?.data || [];
  const pagination = data?.pagination || { total: 0, pages: 1 };

  // Mutations
  const actionMutation = useMutation({
    mutationFn: async ({ id, type, remarks }) => {
      if (type === "approve") {
        return approveRefund(id, remarks);
      } else if (type === "reject") {
        return rejectRefund(id, remarks);
      } else if (type === "process") {
        return processRefund(id);
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(["adminRefunds"]);
      queryClient.invalidateQueries(["patientRefunds"]);
      setSelectedRefund(null);
      setActionType(null);
      setAdminRemarks("");
      setErrorMessage("");
      
      const actionName = variables.type === "approve" ? "Approved" : variables.type === "reject" ? "Rejected" : "Processed";
      setSuccessMessage(`Refund request has been successfully ${actionName}!`);
      setTimeout(() => setSuccessMessage(""), 4500);
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || "Failed to dispatch admin refund request update.");
    }
  });

  const handleActionSubmit = (e) => {
    e.preventDefault();
    if (!selectedRefund || !actionType) return;
    
    if (actionType === "reject" && (!adminRemarks || adminRemarks.trim().length < 5)) {
      setErrorMessage("Rejection remarks must be at least 5 characters long");
      return;
    }

    actionMutation.mutate({
      id: selectedRefund._id,
      type: actionType,
      remarks: adminRemarks
    });
  };

  const triggerProcessRefund = (refund) => {
    if (window.confirm(`Are you sure you want to process this refund of ₹${refund.refundAmount} to Razorpay?`)) {
      actionMutation.mutate({
        id: refund._id,
        type: "process"
      });
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "refunded":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "rejected":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "processing":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "approved":
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
      case "requested":
      default:
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-50 tracking-tight">Refund Queue</h1>
          <p className="text-sm text-slate-400 mt-1">Review balance claims, process verified cancellations, and manage billing returns</p>
        </div>

        {/* Filter Selection */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className={`px-3 py-1.5 text-xs font-semibold ${THEME.glass.input} border-white/10`}
          >
            <option value="">All Requests</option>
            <option value="requested">Requested</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="processing">Processing</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      {/* Success Banner */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium text-left animate-pulse">
          {successMessage}
        </div>
      )}

      {/* Main Container */}
      {isLoading ? (
        <div className="space-y-4">
          <ListItemSkeleton />
          <ListItemSkeleton />
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-left">
          Failed to fetch administrative refund list database logs.
        </div>
      ) : refundsList.length === 0 ? (
        <EmptyState
          title="No Claims Found"
          description="There are no active refund requests matching the current status filter."
          iconType="payments"
        />
      ) : (
        <div className="space-y-4">
          <div className={`${THEME.glass.card} overflow-hidden border border-white/5`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-900/20">
                    <th className="py-4 px-6">Patient details</th>
                    <th className="py-4 px-6">Visit summary</th>
                    <th className="py-4 px-6">Original Paid</th>
                    <th className="py-4 px-6">Refund Amount</th>
                    <th className="py-4 px-6">Reason</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-center">Review Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                  {refundsList.map((refund) => {
                    const patientName = refund.patientId?.userId?.name || "Patient Account";
                    const patientEmail = refund.patientId?.userId?.email || "";
                    const doctorName = refund.appointmentId?.doctorId?.userId?.name || "Practitioner";
                    const specialization = refund.appointmentId?.doctorId?.specialization || "General";
                    
                    return (
                      <tr key={refund._id} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-bold text-slate-100">{patientName}</p>
                            <p className="text-[10px] text-slate-500">{patientEmail}</p>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-semibold text-slate-200">Dr. {doctorName}</p>
                            <p className="text-[10px] text-sky-400">{specialization}</p>
                          </div>
                        </td>
                        <td className="py-4 px-6 font-semibold text-slate-400">
                          ₹{refund.amount}
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-extrabold text-slate-100">₹{refund.refundAmount}</span>
                          <span className="text-[9px] text-slate-500 ml-1">({refund.refundPercentage}%)</span>
                        </td>
                        <td className="py-4 px-6 truncate max-w-[160px]" title={refund.refundReason}>
                          {refund.refundReason}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-block text-[9px] font-bold border px-2.5 py-0.5 rounded-full uppercase ${getStatusBadge(refund.refundStatus)}`}>
                            {refund.refundStatus}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex gap-2 justify-center">
                            {refund.refundStatus === "requested" && (
                              <>
                                <button
                                  onClick={() => { setSelectedRefund(refund); setActionType("approve"); setErrorMessage(""); }}
                                  className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => { setSelectedRefund(refund); setActionType("reject"); setErrorMessage(""); }}
                                  className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {refund.refundStatus === "approved" && (
                              <button
                                onClick={() => triggerProcessRefund(refund)}
                                className="text-[10px] uppercase font-bold tracking-wider px-3 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                              >
                                Process Razorpay
                              </button>
                            )}

                            {refund.refundStatus === "processing" && (
                              <span className="text-[10px] font-bold text-slate-400 animate-pulse">Syncing Gateway...</span>
                            )}

                            {["refunded", "rejected"].includes(refund.refundStatus) && (
                              <span className="text-[10px] text-slate-500 font-semibold italic">Decision Logged</span>
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
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-slate-900/20">
                <span className="text-xs text-slate-400">
                  Page <strong className="text-slate-200">{currentPage}</strong> of <strong className="text-slate-200">{pagination.pages}</strong> ({pagination.total} claims)
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
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, pagination.pages))}
                    disabled={currentPage === pagination.pages}
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

      {/* DECISION DIALOG MODAL (Approve / Reject) */}
      {selectedRefund && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => { setSelectedRefund(null); setActionType(null); }}></div>
          
          <div className={`w-full max-w-md p-6 relative z-10 ${THEME.glass.card} border border-white/10`}>
            <h3 className="font-bold text-slate-100 text-md mb-2 capitalize text-left">
              {actionType} Refund Request
            </h3>
            
            <p className="text-xs text-slate-400 mb-4 text-left">
              Patient: {selectedRefund.patientId?.userId?.name || "Patient"}<br />
              Requested amount: <strong className="text-slate-200">₹{selectedRefund.refundAmount}</strong> ({selectedRefund.refundPercentage}% return)
            </p>

            <form onSubmit={handleActionSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-left">
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 text-left">
                  Remarks / Comments
                </label>
                <textarea
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  className={`w-full px-4 py-3 text-xs ${THEME.glass.input} resize-none`}
                  rows="3"
                  placeholder={
                    actionType === "reject"
                      ? "Describe the cancellation timeline violation reason..."
                      : "Optional approval remarks..."
                  }
                  required={actionType === "reject"}
                  minLength={actionType === "reject" ? 5 : 0}
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => { setSelectedRefund(null); setActionType(null); }}
                  className="flex-1 py-2.5 bg-white/5 border border-white/10 text-slate-300 text-xs font-semibold uppercase tracking-wider rounded-xl hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionMutation.isPending}
                  className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-xl transition-all ${
                    actionType === "reject"
                      ? "bg-red-600 hover:bg-red-700 text-white font-bold"
                      : THEME.glass.buttonPrimary
                  }`}
                >
                  {actionMutation.isPending ? "Submitting..." : `Confirm ${actionType}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
