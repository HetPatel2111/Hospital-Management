import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listDoctorsAdmin,
  approveDoctor,
  rejectDoctor,
  suspendDoctor,
  reactivateDoctor,
  createDoctorAdmin
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

  // Add doctor form states
  const [isAddingDoctor, setIsAddingDoctor] = useState(false);
  const [docName, setDocName] = useState("");
  const [docEmail, setDocEmail] = useState("");
  const [docPhone, setDocPhone] = useState("");
  const [docPassword, setDocPassword] = useState("");
  const [docRegNum, setDocRegNum] = useState("");
  const [docSpec, setDocSpec] = useState("");
  const [docExp, setDocExp] = useState(0);
  const [docQual, setDocQual] = useState("");
  const [docFee, setDocFee] = useState(300);
  const [docBio, setDocBio] = useState("");

  const createDoctorMutation = useMutation({
    mutationFn: (payload) => createDoctorAdmin(payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["adminDoctors"]);
      queryClient.invalidateQueries(["adminKPIs"]);
      queryClient.invalidateQueries(["adminDocAnalytics"]);
      setIsAddingDoctor(false);
      
      // Reset form
      setDocName("");
      setDocEmail("");
      setDocPhone("");
      setDocPassword("");
      setDocRegNum("");
      setDocSpec("");
      setDocExp(0);
      setDocQual("");
      setDocFee(300);
      setDocBio("");

      setSuccessMessage("Doctor registered successfully!");
      setTimeout(() => setSuccessMessage(""), 4000);
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || "Failed to register doctor.");
      setTimeout(() => setErrorMessage(""), 4500);
    }
  });

  const handleAddDoctorSubmit = (e) => {
    e.preventDefault();
    
    const qualification = docQual
      .split(",")
      .map((q) => q.trim())
      .filter((q) => q.length > 0);

    if (qualification.length === 0) {
      setErrorMessage("Please supply at least one qualification credential (e.g. MBBS).");
      return;
    }

    createDoctorMutation.mutate({
      fullName: docName,
      email: docEmail,
      phone: docPhone || undefined,
      password: docPassword,
      registrationNumber: docRegNum,
      specialization: docSpec,
      experienceYears: Number(docExp),
      qualification,
      consultationFee: Number(docFee),
      bio: docBio || undefined,
      status: "approved"
    });
  };

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
        <button
          onClick={() => { setIsAddingDoctor(true); setErrorMessage(""); }}
          className={THEME.glass.buttonPrimary}
        >
          + Add Doctor
        </button>
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
      {/* ADD DOCTOR MODAL DIALOG OVERLAY */}
      {isAddingDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsAddingDoctor(false)}></div>
          
          <div className={`w-full max-w-xl p-6 relative z-10 my-8 ${THEME.glass.card} border border-white/10 max-h-[90vh] overflow-y-auto`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-slate-100 text-md">Register New Doctor</h3>
                <p className="text-xs text-slate-400 mt-1">Onboard a new medical practitioner to the system listing catalog.</p>
              </div>
              <button onClick={() => setIsAddingDoctor(false)} className="text-slate-400 hover:text-slate-200">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddDoctorSubmit} className="space-y-4 text-xs text-slate-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div>
                  <label className="block text-slate-400 mb-1.5 uppercase font-bold tracking-wider text-[9px]">Full Name</label>
                  <input
                    type="text"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    placeholder="e.g. Dr. John Watson"
                    className={`w-full px-3 py-2 ${THEME.glass.input}`}
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-slate-400 mb-1.5 uppercase font-bold tracking-wider text-[9px]">Email Address</label>
                  <input
                    type="email"
                    value={docEmail}
                    onChange={(e) => setDocEmail(e.target.value)}
                    placeholder="watson@gmail.com"
                    className={`w-full px-3 py-2 ${THEME.glass.input}`}
                    required
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-slate-400 mb-1.5 uppercase font-bold tracking-wider text-[9px]">Contact Phone</label>
                  <input
                    type="tel"
                    value={docPhone}
                    onChange={(e) => setDocPhone(e.target.value)}
                    placeholder="+1555123456"
                    className={`w-full px-3 py-2 ${THEME.glass.input}`}
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-slate-400 mb-1.5 uppercase font-bold tracking-wider text-[9px]">Password</label>
                  <input
                    type="password"
                    value={docPassword}
                    onChange={(e) => setDocPassword(e.target.value)}
                    placeholder="Min 8 chars, A-Z, a-z, 0-9"
                    className={`w-full px-3 py-2 ${THEME.glass.input}`}
                    required
                  />
                </div>

                {/* Reg number */}
                <div>
                  <label className="block text-slate-400 mb-1.5 uppercase font-bold tracking-wider text-[9px]">Registration Number</label>
                  <input
                    type="text"
                    value={docRegNum}
                    onChange={(e) => setDocRegNum(e.target.value)}
                    placeholder="REG-D10099"
                    className={`w-full px-3 py-2 ${THEME.glass.input}`}
                    required
                  />
                </div>

                {/* Specialization */}
                <div>
                  <label className="block text-slate-400 mb-1.5 uppercase font-bold tracking-wider text-[9px]">Specialization</label>
                  <input
                    type="text"
                    value={docSpec}
                    onChange={(e) => setDocSpec(e.target.value)}
                    placeholder="Cardiology"
                    className={`w-full px-3 py-2 ${THEME.glass.input}`}
                    required
                  />
                </div>

                {/* Exp Years */}
                <div>
                  <label className="block text-slate-400 mb-1.5 uppercase font-bold tracking-wider text-[9px]">Years Experience</label>
                  <input
                    type="number"
                    value={docExp}
                    onChange={(e) => setDocExp(e.target.value)}
                    min="0"
                    max="80"
                    className={`w-full px-3 py-2 ${THEME.glass.input}`}
                    required
                  />
                </div>

                {/* Consultation Fee */}
                <div>
                  <label className="block text-slate-400 mb-1.5 uppercase font-bold tracking-wider text-[9px]">Consultation Fee (₹)</label>
                  <input
                    type="number"
                    value={docFee}
                    onChange={(e) => setDocFee(e.target.value)}
                    min="0"
                    className={`w-full px-3 py-2 ${THEME.glass.input}`}
                    required
                  />
                </div>
              </div>

              {/* Qualifications */}
              <div>
                <label className="block text-slate-400 mb-1.5 uppercase font-bold tracking-wider text-[9px]">Qualifications (comma-separated list)</label>
                <input
                  type="text"
                  value={docQual}
                  onChange={(e) => setDocQual(e.target.value)}
                  placeholder="MBBS, MD, FRCP"
                  className={`w-full px-3 py-2 ${THEME.glass.input}`}
                  required
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-slate-400 mb-1.5 uppercase font-bold tracking-wider text-[9px]">Biography / Background Profile</label>
                <textarea
                  value={docBio}
                  onChange={(e) => setDocBio(e.target.value)}
                  placeholder="Professional background details..."
                  className={`w-full px-3 py-2 ${THEME.glass.input} resize-none`}
                  rows="3"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsAddingDoctor(false)}
                  className="flex-1 py-2.5 bg-white/5 border border-white/10 text-slate-300 text-xs font-semibold uppercase tracking-wider rounded-xl hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createDoctorMutation.isPending}
                  className="flex-1 py-2.5 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                >
                  {createDoctorMutation.isPending ? "Adding..." : "Onboard Doctor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
