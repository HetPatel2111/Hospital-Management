import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllPayments, getOverviewKPIs } from "../../services/adminService.js";
import { THEME } from "../../theme/index.js";
import { ListItemSkeleton } from "../../components/Skeletons.jsx";
import EmptyState from "../../components/EmptyState.jsx";

export default function AdminPayments() {
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState(""); // "" | "success" | "pending" | "failed" | "refunded"

  // Fetch payments list query
  const { data: paymentsData, isLoading: paymentsLoading, error: paymentsError } = useQuery({
    queryKey: ["adminPayments", { page: currentPage, status: statusFilter }],
    queryFn: () => {
      const params = { page: currentPage, limit: 8 };
      if (statusFilter) params.status = statusFilter;
      return getAllPayments(params);
    }
  });

  // Fetch KPIs for revenue summary cards
  const { data: kpisData } = useQuery({
    queryKey: ["adminKPIs"],
    queryFn: getOverviewKPIs
  });

  const paymentsList = paymentsData?.data || [];
  const pagination = paymentsData?.pagination || { total: 0, totalPages: 1 };
  const revenueTotal = kpisData?.data?.totalRevenue || 0;
  const refundsTotal = kpisData?.data?.totalRefunds || 0;

  const getStatusBadge = (status) => {
    switch (status) {
      case "success":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "failed":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "refunded":
        return "bg-slate-500/10 text-slate-400 border-slate-500/20";
      case "pending":
      default:
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-50 tracking-tight">Payments Ledger</h1>
        <p className="text-sm text-slate-400 mt-1">Audit all billing transactions, track patient order payouts, and monitor Razorpay gateway settlements.</p>
      </div>

      {/* Revenue Summary Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className={`${THEME.glass.card} p-5 border border-white/5`}>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gross Capital Revenue</p>
          <h3 className="text-xl font-extrabold text-emerald-400 mt-1">₹{revenueTotal}</h3>
          <p className="text-[10px] text-slate-500 mt-1">Sum of all successfully settled patient payments</p>
        </div>
        <div className={`${THEME.glass.card} p-5 border border-white/5`}>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Refund Liabilities</p>
          <h3 className="text-xl font-extrabold text-slate-300 mt-1">₹{refundsTotal}</h3>
          <p className="text-[10px] text-slate-500 mt-1">Sum of all processed Razorpay cancellation refunds</p>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex justify-between items-center bg-slate-900/20 p-4 rounded-2xl border border-white/5">
        <div className="flex items-center gap-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className={`px-3 py-1.5 text-xs font-semibold ${THEME.glass.input} border-white/10`}
          >
            <option value="">All Transactions</option>
            <option value="success">Success</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
        <span className="text-[10px] font-mono text-slate-500">Gateway: Razorpay (Test Mode)</span>
      </div>

      {/* Transactions Table */}
      {paymentsLoading ? (
        <div className="space-y-4">
          <ListItemSkeleton />
          <ListItemSkeleton />
        </div>
      ) : paymentsError ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          Failed to fetch transactional ledger records.
        </div>
      ) : paymentsList.length === 0 ? (
        <EmptyState
          title="No Transactions Logged"
          description="There are no transaction records found matching the status filter."
          iconType="payments"
        />
      ) : (
        <div className="space-y-4">
          <div className={`${THEME.glass.card} overflow-hidden border border-white/5`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-900/20">
                    <th className="py-4 px-6">Patient Details</th>
                    <th className="py-4 px-6">Transaction Date</th>
                    <th className="py-4 px-6">Razorpay Order / Pay ID</th>
                    <th className="py-4 px-6">Settled Amount</th>
                    <th className="py-4 px-6">Payment Method</th>
                    <th className="py-4 px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                  {paymentsList.map((payment) => {
                    const patientName = payment.patientId?.userId?.name || "Patient";
                    const patientEmail = payment.patientId?.userId?.email || "";
                    
                    const transactionDate = payment.paidAt
                      ? new Date(payment.paidAt).toLocaleDateString(undefined, {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })
                      : payment.createdAt
                      ? new Date(payment.createdAt).toLocaleDateString(undefined, {
                          weekday: "short",
                          year: "numeric",
                          month: "short",
                          day: "numeric"
                        })
                      : "Pending Date";

                    return (
                      <tr key={payment._id} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-6">
                          <p className="font-bold text-slate-100">{patientName}</p>
                          <p className="text-[10px] text-slate-500">{patientEmail}</p>
                        </td>
                        <td className="py-4 px-6">
                          <p className="font-medium text-slate-200">{transactionDate}</p>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-[10px] text-slate-400 font-mono">Order: {payment.razorpayOrderId}</p>
                          {payment.razorpayPaymentId && (
                            <p className="text-[9px] text-slate-500 font-mono mt-0.5">Pay: {payment.razorpayPaymentId}</p>
                          )}
                        </td>
                        <td className="py-4 px-6 font-extrabold text-slate-100">
                          ₹{payment.amount}
                        </td>
                        <td className="py-4 px-6 uppercase font-bold text-[9px] text-slate-400">
                          {payment.paymentMethod || "N/A"}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-block text-[9px] font-bold border px-2.5 py-0.5 rounded-full uppercase ${getStatusBadge(payment.paymentStatus)}`}>
                            {payment.paymentStatus}
                          </span>
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
                  Page <strong className="text-slate-200">{currentPage}</strong> of <strong className="text-slate-200">{pagination.totalPages}</strong> ({pagination.total} transactions)
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
