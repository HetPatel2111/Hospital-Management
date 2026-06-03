import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyPayments } from "../../services/paymentService.js";
import { THEME } from "../../theme/index.js";
import { CardSkeleton } from "../../components/Skeletons.jsx";
import EmptyState from "../../components/EmptyState.jsx";

export default function PatientPayments() {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedPaymentId, setExpandedPaymentId] = useState(null);
  const itemsPerPage = 8;

  // Fetch payments list
  const { data, isLoading, error } = useQuery({
    queryKey: ["patientPayments"],
    queryFn: getMyPayments,
  });

  const paymentsList = data?.data || [];

  const getStatusBadge = (status) => {
    switch (status) {
      case "success":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "failed":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "refunded":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "pending":
      default:
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
  };

  const getRefundStatusBadge = (status) => {
    switch (status) {
      case "refunded":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "processing":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "requested":
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
      case "none":
      default:
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  // Pagination logic
  const totalItems = paymentsList.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPayments = paymentsList.slice(indexOfFirstItem, indexOfLastItem);

  const toggleExpandRow = (paymentId) => {
    if (expandedPaymentId === paymentId) {
      setExpandedPaymentId(null);
    } else {
      setExpandedPaymentId(paymentId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="text-left">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-50 tracking-tight">Payments Log</h1>
        <p className="text-sm text-slate-400 mt-1">Review billing receipts, transaction details, and payment histories</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          Failed to fetch payment details. Please check your connection.
        </div>
      ) : paymentsList.length === 0 ? (
        <EmptyState
          title="No Transaction Logs"
          description="You do not have any past payments or invoices in your billing history."
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
                    <th className="py-4 px-6">Transaction Date</th>
                    <th className="py-4 px-6">Doctor Details</th>
                    <th className="py-4 px-6">Order ID</th>
                    <th className="py-4 px-6">Amount</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {currentPayments.map((payment) => {
                    const isExpanded = expandedPaymentId === payment._id;
                    const doctorName = payment.appointmentId?.doctorId?.userId?.name || "Practitioner";
                    const specialization = payment.appointmentId?.doctorId?.specialization || "General";
                    
                    return (
                      <React.Fragment key={payment._id}>
                        <tr className="text-xs text-slate-300 hover:bg-white/5 transition-colors">
                          <td className="py-4 px-6 font-semibold">
                            {new Date(payment.createdAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </td>
                          <td className="py-4 px-6">
                            <div>
                              <p className="font-bold text-slate-100">{doctorName}</p>
                              <p className="text-[10px] text-sky-400 font-medium">{specialization}</p>
                            </div>
                          </td>
                          <td className="py-4 px-6 font-mono text-[10px] text-slate-400">
                            {payment.razorpayOrderId}
                          </td>
                          <td className="py-4 px-6 font-extrabold text-slate-100">
                            ₹{payment.amount}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-block text-[9px] font-bold border px-2.5 py-0.5 rounded-full uppercase ${getStatusBadge(payment.paymentStatus)}`}>
                              {payment.paymentStatus}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center">
                            <button
                              onClick={() => toggleExpandRow(payment._id)}
                              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-sky-400 transition-all flex items-center gap-1.5 mx-auto"
                            >
                              <span>{isExpanded ? "Hide Details" : "View Details"}</span>
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

                        {/* Expandable Details Area */}
                        {isExpanded && (
                          <tr>
                            <td colSpan="6" className="bg-slate-950/40 p-6 border-b border-white/5 text-left">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                                {/* Col 1: Razorpay Identifiers */}
                                <div className="space-y-3 p-4 rounded-xl bg-slate-900/40 border border-white/5">
                                  <h4 className="text-[10px] uppercase font-bold text-sky-400 tracking-wider mb-2">Gateway Tokens</h4>
                                  <div>
                                    <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Razorpay Order ID</span>
                                    <span className="font-mono text-slate-300 select-all">{payment.razorpayOrderId}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Razorpay Payment ID</span>
                                    <span className="font-mono text-slate-300 select-all">{payment.razorpayPaymentId || "N/A"}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Razorpay Signature</span>
                                    <span className="font-mono text-slate-400 select-all truncate block max-w-[240px]">{payment.razorpaySignature || "N/A"}</span>
                                  </div>
                                </div>

                                {/* Col 2: Invoicing Info */}
                                <div className="space-y-3 p-4 rounded-xl bg-slate-900/40 border border-white/5">
                                  <h4 className="text-[10px] uppercase font-bold text-sky-400 tracking-wider mb-2">Billing Ledger</h4>
                                  <div>
                                    <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Method</span>
                                    <span className="font-semibold text-slate-300 capitalize">{payment.paymentMethod || "razorpay"}</span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Paid Timestamp</span>
                                    <span className="font-semibold text-slate-300">
                                      {payment.paidAt ? new Date(payment.paidAt).toLocaleString("en-US") : "Unpaid"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Currency</span>
                                    <span className="font-semibold text-slate-300 uppercase">{payment.currency}</span>
                                  </div>
                                </div>

                                {/* Col 3: Consultation Details */}
                                <div className="space-y-3 p-4 rounded-xl bg-slate-900/40 border border-white/5">
                                  <h4 className="text-[10px] uppercase font-bold text-sky-400 tracking-wider mb-2">Booking & Returns</h4>
                                  <div>
                                    <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Consultation Date</span>
                                    <span className="font-semibold text-slate-300">
                                      {payment.appointmentId?.appointmentDate 
                                        ? new Date(payment.appointmentId.appointmentDate).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" })
                                        : "N/A"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Shift Slot</span>
                                    <span className="font-semibold text-slate-300">
                                      {payment.appointmentId?.startTime 
                                        ? `${payment.appointmentId.startTime} - ${payment.appointmentId.endTime}`
                                        : "N/A"}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Refund Status</span>
                                    <span className={`inline-block text-[9px] font-bold border px-2 py-0.5 rounded-full uppercase mt-1 ${getRefundStatusBadge(payment.refundStatus)}`}>
                                      {payment.refundStatus || "none"}
                                    </span>
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
                  Page <strong className="text-slate-200">{currentPage}</strong> of <strong className="text-slate-200">{totalPages}</strong> ({totalItems} transactions)
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
