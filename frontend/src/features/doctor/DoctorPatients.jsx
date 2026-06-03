import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMyAppointments } from "../../services/doctorService.js";
import { THEME } from "../../theme/index.js";
import { ListItemSkeleton } from "../../components/Skeletons.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import { Link } from "react-router-dom";

export default function DoctorPatients() {
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch doctor's appointments to aggregate unique patients list
  const { data, isLoading, error } = useQuery({
    queryKey: ["doctorAppointments"],
    queryFn: () => getMyAppointments({ limit: 100 })
  });

  const appointmentsList = data?.data?.appointments || [];

  // Group unique patients
  const patientMap = {};
  appointmentsList.forEach((appt) => {
    const patient = appt.patientId;
    if (!patient) return;
    
    const pid = patient._id;
    const name = patient.userId?.name || "Patient";
    const email = patient.userId?.email || "";
    const phone = patient.userId?.phone || "N/A";

    if (!patientMap[pid]) {
      patientMap[pid] = {
        id: pid,
        name,
        email,
        phone,
        totalVisits: 0,
        lastVisit: null
      };
    }

    patientMap[pid].totalVisits += 1;
    const apptDate = appt.appointmentDate ? new Date(appt.appointmentDate) : null;
    if (apptDate) {
      if (!patientMap[pid].lastVisit || apptDate > new Date(patientMap[pid].lastVisit)) {
        patientMap[pid].lastVisit = appt.appointmentDate;
      }
    }
  });

  const allPatients = Object.values(patientMap);

  // Filter patients by search query
  const filteredPatients = allPatients.filter((pat) => {
    const term = searchQuery.toLowerCase();
    return (
      pat.name.toLowerCase().includes(term) ||
      pat.email.toLowerCase().includes(term) ||
      pat.phone.includes(term)
    );
  });

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-left">
        Failed to fetch patients list database records.
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-50 tracking-tight">Assigned Patients</h1>
        <p className="text-sm text-slate-400 mt-1">Directory of all patients who have scheduled clinical visits with you.</p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search patient registry by name, email, or phone..."
          className={`w-full px-4 py-2.5 text-xs ${THEME.glass.input}`}
        />
      </div>

      {/* Patients Table */}
      {isLoading ? (
        <div className="space-y-4">
          <ListItemSkeleton />
          <ListItemSkeleton />
        </div>
      ) : filteredPatients.length === 0 ? (
        <EmptyState
          title="No Patients Registered"
          description="There are no patients in your registry matching the search filters."
          iconType="doctors"
        />
      ) : (
        <div className={`${THEME.glass.card} overflow-hidden border border-white/5`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-900/20">
                  <th className="py-4 px-6">Patient Name</th>
                  <th className="py-4 px-6">Email Address</th>
                  <th className="py-4 px-6">Contact Phone</th>
                  <th className="py-4 px-6 text-center">Consultations</th>
                  <th className="py-4 px-6">Last Appointment</th>
                  <th className="py-4 px-6 text-center">Medical File</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                {filteredPatients.map((pat) => {
                  const lastVisitStr = pat.lastVisit
                    ? new Date(pat.lastVisit).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric"
                      })
                    : "N/A";
                  
                  return (
                    <tr key={pat.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-100">{pat.name}</td>
                      <td className="py-4 px-6 text-slate-400">{pat.email}</td>
                      <td className="py-4 px-6 font-mono text-slate-400">{pat.phone}</td>
                      <td className="py-4 px-6 text-center font-bold text-slate-200">{pat.totalVisits}</td>
                      <td className="py-4 px-6 text-slate-300 font-medium">{lastVisitStr}</td>
                      <td className="py-4 px-6">
                        <div className="flex justify-center">
                          <Link
                            to={`/doctor/patients/${pat.id}`}
                            className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 transition-all"
                          >
                            Open Dossier
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
