import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyRefunds } from "../../services/refundService.js";
import { THEME } from "../../theme/index.js";
import { CardSkeleton } from "../../components/Skeletons.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import RefundTimeline from "../../components/RefundTimeline.jsx";

export default function PatientRefunds() {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRefundId, setExpandedRefundId] = useState(null);
  const itemsPerPage = 8;

  // Fetch refund requests list
  const { data, isLoading, error } = useQuery({
    queryKey: ["patientRefunds"],
    queryFn: getMyRefunds
  });

  const refundsList = data?.data || [];

  // Calculate dashboard statistics metrics
  const totalRefundsCount = refundsList.length;
  const pendingRefundsCount = refundsList.filter((r) =>
    ["requested", "approved", "processing"].includes(r.refundStatus)
  ).length;
  const totalRefundedSum = refundsList
    .filter((r) => r.refundStatus === "refunded")
    .reduce((sum, r) => sum + (r.refundAmount || 0), 0);

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

  // Pagination logic
  const totalItems = refundsList.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentRefunds = refundsList.slice(indexOfFirstItem, indexOfLastItem);

  const toggleExpandRow = (refundId) => {
    if (expandedRefundId === refundId) {
      setExpandedRefundId(null);
    } else {
      setExpandedRefundId(refundId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="text-left">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-50 tracking-tight">Refund History</h1>
        <p className="text-sm text-slate-400 mt-1">Review balance returns, approval statuses, and refund processing details</p>
      </div>

      {/* Overview Stats Cards (Dashboard metrics requested) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <div className={`p-5 ${THEME.glass.card} flex flex-col justify-between text-left`}>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Refunds Requested</span>
              <div className="flex items-end justify-between mt-3">
                <span className="text-3xl font-extrabold text-slate-100">{totalRefundsCount}</span>
                <span className="text-xs text-slate-500">Submissions count</span>
              </div>
            </div>

            <div className={`p-5 ${THEME.glass.card} flex flex-col justify-between text-left`}>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Pending Refunds Queue</span>
              <div className="flex items-end justify-between mt-3">
                <span className="text-3xl font-extrabold text-slate-100">{pendingRefundsCount}</span>
                <span className="text-xs text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider text-[8px]">In Review</span>
              </div>
            </div>

            <div className={`p-5 ${THEME.glass.card} flex flex-col justify-between text-left`}>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Refunded Total Amount</span>
              <div className="flex items-end justify-between mt-3">
                <span className="text-3xl font-extrabold text-sky-400">₹{totalRefundedSum}</span>
                <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider text-[8px]">Processed</span>
              </div>
            </div>
          </>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4">
          <CardSkeleton />
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-left">
          Failed to fetch refund histories. Please try again.
        </div>
      ) : refundsList.length === 0 ? (
        <EmptyState
          title="No Refunds History"
          description="You do not have any requested, pending, or completed balance refunds."
          iconType="payments"
        />
      ) : (
        <div className="space-y-4">
          {/* Glassmorphic Table Card */}
          <div className={`${THEME.glass.card} overflow-hidden border border-white/5`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-900/20">
                    <th className="py-4 px-6">Requested Date</th>
                    <th className="py-4 px-6">Doctor / Visit</th>
                    <th className="py-4 px-6">Original Paid</th>
                    <th className="py-4 px-6">Refund Claim</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {currentRefunds.map((refund) => {
                    const isExpanded = expandedRefundId === refund._id;
                    const doctorName = refund.appointmentId?.doctorId?.userId?.name || "Practitioner";
                    const specialization = refund.appointmentId?.doctorId?.specialization || "General";
                    
                    return (
                      <React.Fragment key={refund._id}>
                        <tr className="text-xs text-slate-300 hover:bg-white/5 transition-colors">
                          <td className="py-4 px-6 font-semibold">
                            {new Date(refund.createdAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric"
                            })}
                          </td>
                          <td className="py-4 px-6">
                            <div>
                              <p className="font-bold text-slate-100">{doctorName}</p>
                              <p className="text-[10px] text-sky-400 font-medium">{specialization}</p>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-slate-400 font-medium">
                            ₹{refund.amount}
                          </td>
                          <td className="py-4 px-6">
                            <span className="font-extrabold text-slate-100">₹{refund.refundAmount}</span>
                            <span className="text-[9px] text-slate-500 ml-1">({refund.refundPercentage}%)</span>
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-block text-[9px] font-bold border px-2.5 py-0.5 rounded-full uppercase ${getStatusBadge(refund.refundStatus)}`}>
                              {refund.refundStatus}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <button
                              onClick={() => toggleExpandRow(refund._id)}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-sky-400 transition-all flex items-center gap-1.5 mx-auto"
                            >
                              <span>{isExpanded ? "Hide Tracker" : "Track Request"}</span>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2.5}
                                stroke="currentColor"
                                className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                              </svg>
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Details and Timeline */}
                        {isExpanded && (
                          <tr>
                            <td colSpan="6" className="bg-slate-950/40 p-6 border-b border-white/5 text-left">
                              <div className="space-y-6">
                                {/* Visual Step Tracker Timeline */}
                                <div className="p-4 rounded-xl bg-slate-900/30 border border-white/5">
                                  <h4 className="text-[10px] uppercase font-bold text-sky-400 tracking-wider mb-4 text-center">Refund Progress Timeline</h4>
                                  <RefundTimeline status={refund.refundStatus} />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                                  {/* Left Col: Request parameters */}
                                  <div className="space-y-3 p-4 rounded-xl bg-slate-900/40 border border-white/5">
                                    <h4 className="text-[10px] uppercase font-bold text-sky-400 tracking-wider mb-1">Request Parameters</h4>
                                    <div>
                                      <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Refund Reason</span>
                                      <p className="text-slate-200 mt-0.5 leading-relaxed font-medium bg-slate-950/30 p-2.5 rounded-lg border border-white/5">
                                        {refund.refundReason}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Submission Timestamp</span>
                                      <span className="font-semibold text-slate-300">
                                        {new Date(refund.createdAt).toLocaleString("en-US")}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Right Col: Admin Review decision */}
                                  <div className="space-y-3 p-4 rounded-xl bg-slate-900/40 border border-white/5">
                                    <h4 className="text-[10px] uppercase font-bold text-sky-400 tracking-wider mb-1">Administrative Decision</h4>
                                    {refund.decisionAt ? (
                                      <>
                                        <div>
                                          <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Decision Date</span>
                                          <span className="font-semibold text-slate-300">
                                            {new Date(refund.decisionAt).toLocaleString("en-US")}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Remarks</span>
                                          <p className="text-slate-200 mt-0.5 leading-relaxed font-medium bg-slate-950/30 p-2.5 rounded-lg border border-white/5">
                                            {refund.adminRemarks || "No administrative comments."}
                                          </p>
                                        </div>
                                        {refund.gatewayRefundId && (
                                          <div>
                                            <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Gateway Return ID</span>
                                            <span className="font-mono text-sky-400 select-all">{refund.gatewayRefundId}</span>
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <div className="flex flex-col items-center justify-center h-28 text-slate-500 border border-dashed border-white/10 rounded-lg">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 mb-2 text-slate-500 animate-pulse">
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                                        </svg>
                                        <span className="text-[10px] uppercase tracking-wider font-bold">Waiting for Admin Review</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-slate-900/20">
                <span className="text-xs text-slate-400">
                  Page <strong className="text-slate-200">{currentPage}</strong> of <strong className="text-slate-200">{totalPages}</strong> ({totalItems} refund requests)
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
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
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
