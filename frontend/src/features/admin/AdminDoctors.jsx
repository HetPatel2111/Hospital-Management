import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listDoctorsAdmin,
  approveDoctor,
  rejectDoctor,
  suspendDoctor,
  reactivateDoctor
} from "../../services/adminService.js";
import { THEME } from "../../theme/index.js";
import { ListItemSkeleton } from "../../components/Skeletons.jsx";
import EmptyState from "../../components/EmptyState.jsx";

export default function AdminDoctors() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(""); // "" (all) | "pending" | "approved" | "rejected"
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch doctors query
  const { data, isLoading, error } = useQuery({
    queryKey: ["adminDoctors", { page: currentPage, search: searchQuery, status: statusFilter }],
    queryFn: () => {
      const params = { page: currentPage, limit: 8 };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;
      return listDoctorsAdmin(params);
    }
  });

  const doctorsList = data?.data?.doctors || [];
  const pagination = data?.data?.pagination || { total: 0, totalPages: 1 };

  // Mutations for status changes
  const statusMutation = useMutation({
    mutationFn: async ({ id, action }) => {
      switch (action) {
        case "approve":
          return approveDoctor(id);
        case "reject":
          return rejectDoctor(id);
        case "suspend":
          return suspendDoctor(id);
        case "reactivate":
          return reactivateDoctor(id);
        default:
          throw new Error("Invalid action type");
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(["adminDoctors"]);
      queryClient.invalidateQueries(["adminKPIs"]);
      queryClient.invalidateQueries(["adminDocAnalytics"]);
      
      const actionLabels = {
        approve: "approved",
        reject: "rejected",
        suspend: "suspended",
        reactivate: "reactivated"
      };
      
      setSuccessMessage(`Doctor has been successfully ${actionLabels[variables.action]}!`);
      setTimeout(() => setSuccessMessage(""), 4000);
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || "Failed to update doctor state.");
      setTimeout(() => setErrorMessage(""), 4500);
    }
  });

  const handleAction = (id, action) => {
    const confirmMessage = {
      approve: "Are you sure you want to approve this doctor credentials and activate their catalog listing?",
      reject: "Are you sure you want to reject this doctor application?",
      suspend: "Are you sure you want to suspend this doctor account? They will not be able to log in or take appointments.",
      reactivate: "Are you sure you want to reactivate this doctor account?"
    };

    if (window.confirm(confirmMessage[action])) {
      statusMutation.mutate({ id, action });
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "approved":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "rejected":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "pending":
      default:
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-50 tracking-tight">Manage Doctors</h1>
          <p className="text-sm text-slate-400 mt-1">Review onboarding credentials, verify certificates, approve listings, or toggle practitioner accounts status.</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder="Search by name, email, specialization, or registration number..."
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
            <option value="pending">Pending Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Suspended/Rejected</option>
          </select>
        </div>
      </div>

      {/* Message banners */}
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

      {/* Doctors Grid */}
      {isLoading ? (
        <div className="space-y-4">
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          Failed to fetch registered practitioners database records.
        </div>
      ) : doctorsList.length === 0 ? (
        <EmptyState
          title="No Practitioners Found"
          description="There are no doctors registered matching your current filters."
          iconType="doctors"
        />
      ) : (
        <div className="space-y-4">
          <div className={`${THEME.glass.card} overflow-hidden border border-white/5`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-900/20">
                    <th className="py-4 px-6">Doctor Details</th>
                    <th className="py-4 px-6">Specialization</th>
                    <th className="py-4 px-6">Reg. Number</th>
                    <th className="py-4 px-6">Consultation Fee</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                  {doctorsList.map((doc) => {
                    const name = doc.fullName || doc.userId?.name || "Practitioner";
                    const email = doc.userId?.email || "";
                    const phone = doc.userId?.phone || "No phone";
                    const isUserSuspended = doc.userId?.status === "suspended";
                    
                    return (
                      <tr key={doc.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-bold text-slate-100">Dr. {name}</p>
                            <p className="text-[10px] text-slate-500">{email} | {phone}</p>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-semibold text-slate-200">{doc.specialization}</p>
                            <p className="text-[10px] text-slate-400">{doc.experienceYears} Years Exp.</p>
                          </div>
                        </td>
                        <td className="py-4 px-6 font-mono text-slate-400">
                          {doc.registrationNumber}
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-100">
                          ₹{doc.consultationFee}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex flex-col gap-1 items-start">
                            <span className={`inline-block text-[9px] font-bold border px-2.5 py-0.5 rounded-full uppercase ${getStatusBadge(doc.status)}`}>
                              {doc.status}
                            </span>
                            {isUserSuspended && (
                              <span className="text-[8px] font-bold text-red-400 uppercase tracking-wider">Account Suspended</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex gap-2 justify-center">
                            {doc.status === "pending" && (
                              <>
                                <button
                                  onClick={() => handleAction(doc.id, "approve")}
                                  className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleAction(doc.id, "reject")}
                                  className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
                                >
                                  Reject
                                </button>
                              </>
                            )}

                            {doc.status === "approved" && !isUserSuspended && (
                              <button
                                onClick={() => handleAction(doc.id, "suspend")}
                                className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
                              >
                                Suspend
                              </button>
                            )}

                            {(doc.status === "rejected" || isUserSuspended) && (
                              <button
                                onClick={() => handleAction(doc.id, "reactivate")}
                                className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                              >
                                Reactivate
                              </button>
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
