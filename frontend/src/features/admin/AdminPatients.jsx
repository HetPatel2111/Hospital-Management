import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listPatients,
  suspendPatient,
  reactivatePatient
} from "../../services/adminService.js";
import { THEME } from "../../theme/index.js";
import { ListItemSkeleton } from "../../components/Skeletons.jsx";
import EmptyState from "../../components/EmptyState.jsx";

export default function AdminPatients() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null); // Patient details overlay modal
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch patients query
  const { data, isLoading, error } = useQuery({
    queryKey: ["adminPatients", { page: currentPage, search: searchQuery }],
    queryFn: () => listPatients({ page: currentPage, limit: 8, search: searchQuery })
  });

  const patientsList = data?.data?.patients || [];
  const pagination = data?.data?.pagination || { total: 0, totalPages: 1 };

  // Mutations for suspend/activate
  const patientMutation = useMutation({
    mutationFn: async ({ id, action }) => {
      if (action === "suspend") {
        return suspendPatient(id);
      } else {
        return reactivatePatient(id);
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(["adminPatients"]);
      queryClient.invalidateQueries(["adminKPIs"]);
      
      const label = variables.action === "suspend" ? "suspended" : "reactivated";
      setSuccessMessage(`Patient account has been successfully ${label}!`);
      setSelectedPatient(null);
      setTimeout(() => setSuccessMessage(""), 4000);
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || "Failed to toggle patient status.");
      setTimeout(() => setErrorMessage(""), 4500);
    }
  });

  const handleStatusToggle = (patient, action) => {
    const confirmMessage =
      action === "suspend"
        ? `Are you sure you want to suspend patient "${patient.userId.name}"? They will lose dashboard access.`
        : `Are you sure you want to reactivate patient "${patient.userId.name}"?`;

    if (window.confirm(confirmMessage)) {
      patientMutation.mutate({ id: patient._id, action });
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "active":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "suspended":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "pending":
      default:
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-50 tracking-tight">Manage Patients</h1>
        <p className="text-sm text-slate-400 mt-1">Check registered patient user logs, search user details, and toggle account access blocks.</p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
          placeholder="Search patients by name, email, or contact phone..."
          className={`w-full px-4 py-2.5 text-xs ${THEME.glass.input}`}
        />
      </div>

      {/* Success/Error Banners */}
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

      {/* Patients List Grid */}
      {isLoading ? (
        <div className="space-y-4">
          <ListItemSkeleton />
          <ListItemSkeleton />
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          Failed to fetch administrative patient directory database logs.
        </div>
      ) : patientsList.length === 0 ? (
        <EmptyState
          title="No Patients Registered"
          description="There are no patients registered on the hospital portal matching your search."
          iconType="doctors"
        />
      ) : (
        <div className="space-y-4">
          <div className={`${THEME.glass.card} overflow-hidden border border-white/5`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-900/20">
                    <th className="py-4 px-6">Patient Name</th>
                    <th className="py-4 px-6">Email Address</th>
                    <th className="py-4 px-6">Contact Number</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                  {patientsList.map((pat) => {
                    const name = pat.userId?.name || "Patient";
                    const email = pat.userId?.email || "No email";
                    const phone = pat.userId?.phone || "No contact";
                    const status = pat.userId?.status || "active";
                    
                    return (
                      <tr key={pat._id} className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-100">{name}</td>
                        <td className="py-4 px-6 text-slate-400">{email}</td>
                        <td className="py-4 px-6 font-mono text-slate-400">{phone}</td>
                        <td className="py-4 px-6">
                          <span className={`inline-block text-[9px] font-bold border px-2.5 py-0.5 rounded-full uppercase ${getStatusBadge(status)}`}>
                            {status}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => setSelectedPatient(pat)}
                              className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1.5 rounded bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10 transition-all"
                            >
                              View Details
                            </button>
                            
                            {status === "active" ? (
                              <button
                                onClick={() => handleStatusToggle(pat, "suspend")}
                                className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                              >
                                Suspend
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStatusToggle(pat, "activate")}
                                className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                              >
                                Activate
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

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-slate-900/20">
                <span className="text-xs text-slate-400">
                  Page <strong className="text-slate-200">{currentPage}</strong> of <strong className="text-slate-200">{pagination.totalPages}</strong> ({pagination.total} patients)
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

      {/* Patient details drawer/modal */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setSelectedPatient(null)}></div>
          <div className={`w-full max-w-md p-6 relative z-10 ${THEME.glass.card} border border-white/10`}>
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-slate-100 text-lg">Patient Profile Dossier</h3>
              <button onClick={() => setSelectedPatient(null)} className="text-slate-400 hover:text-slate-200">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2.5">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-400 font-medium">Full Name</span>
                  <span className="text-slate-100 font-bold">{selectedPatient.userId?.name || "Patient"}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-400 font-medium">Email Address</span>
                  <span className="text-slate-100 font-mono">{selectedPatient.userId?.email || "N/A"}</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-400 font-medium">Phone Number</span>
                  <span className="text-slate-100 font-mono">{selectedPatient.userId?.phone || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-medium">Status</span>
                  <span className={`inline-block text-[9px] font-bold border px-2 py-0.25 rounded-full uppercase ${getStatusBadge(selectedPatient.userId?.status || "active")}`}>
                    {selectedPatient.userId?.status || "active"}
                  </span>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button
                  onClick={() => setSelectedPatient(null)}
                  className="flex-1 py-2.5 bg-white/5 border border-white/10 text-slate-300 text-xs font-semibold uppercase tracking-wider rounded-xl hover:bg-white/10 transition-colors"
                >
                  Close
                </button>
                {selectedPatient.userId?.status === "active" ? (
                  <button
                    onClick={() => handleStatusToggle(selectedPatient, "suspend")}
                    className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                  >
                    Suspend User
                  </button>
                ) : (
                  <button
                    onClick={() => handleStatusToggle(selectedPatient, "activate")}
                    className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                  >
                    Reactivate Account
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
