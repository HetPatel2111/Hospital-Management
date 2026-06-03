import React from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMyPatientById, getMyAppointments } from "../../services/doctorService.js";
import { THEME } from "../../theme/index.js";
import { DetailSkeleton } from "../../components/Skeletons.jsx";
import { ROUTES } from "../../constants/routes.js";

export default function DoctorPatientDetails() {
  const { patientId } = useParams();

  // Fetch patient profile dossier
  const { data: patientData, isLoading: patientLoading, error: patientError } = useQuery({
    queryKey: ["doctorPatientDetails", patientId],
    queryFn: () => getMyPatientById(patientId)
  });

  // Fetch all doctor's appointments to filter this patient's visits history
  const { data: apptsData, isLoading: apptsLoading } = useQuery({
    queryKey: ["doctorAppointments"],
    queryFn: () => getMyAppointments({ limit: 100 })
  });

  const patient = patientData?.data?.patient || {};
  const appointmentsList = apptsData?.data?.appointments || [];

  // Filter appointments for this patient
  const patientVisits = appointmentsList.filter(
    (appt) => appt.patientId?._id === patientId
  );

  const isLoading = patientLoading || apptsLoading;

  if (patientError) {
    return (
      <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-left">
        Patient record not found, or you do not have authorization to view this dossier.
        <div className="mt-4">
          <Link to={ROUTES.DOCTOR_PATIENTS} className="text-xs text-sky-400 font-bold hover:underline">
            ← Return to Patient List
          </Link>
        </div>
      </div>
    );
  }

  // Calculate age from DOB
  const getAge = (dobString) => {
    if (!dobString) return "N/A";
    const today = new Date();
    const birthDate = new Date(dobString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header back button */}
      <div>
        <Link
          to={ROUTES.DOCTOR_PATIENTS}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to Patient Directory
        </Link>
      </div>

      {isLoading ? (
        <DetailSkeleton />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Main panels: Demographics & Medical Profile */}
          <div className="lg:col-span-2 space-y-6">
            {/* Demographics Card */}
            <div className={`${THEME.glass.card} p-6 border border-white/5`}>
              <div className="flex items-center gap-4 border-b border-white/5 pb-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-lg">
                  {patient.name?.charAt(0) || "P"}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100">{patient.name || "Patient Dossier"}</h2>
                  <p className="text-xs text-slate-500">Registered: {new Date(patient.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Age / Birth Date</p>
                  <p className="text-slate-200 font-medium mt-1">
                    {getAge(patient.dateOfBirth)} years ({patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : "N/A"})
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Gender</p>
                  <p className="text-slate-200 font-medium capitalize mt-1">{patient.gender || "N/A"}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Blood Group</p>
                  <p className="text-slate-200 font-medium mt-1">{patient.bloodGroup || "N/A"}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Phone Contact</p>
                  <p className="text-slate-200 font-mono mt-1">{patient.phone || "N/A"}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Email Address</p>
                  <p className="text-slate-200 font-mono mt-1">{patient.email || "N/A"}</p>
                </div>
                <div>
                  <p className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Emergency Contact</p>
                  <p className="text-slate-200 mt-1">{patient.emergencyContact || "N/A"}</p>
                </div>
              </div>

              {patient.address && (
                <div className="border-t border-white/5 pt-4 mt-4 text-xs">
                  <p className="text-slate-500 font-semibold uppercase tracking-wider text-[9px]">Residential Address</p>
                  <p className="text-slate-200 mt-1">{patient.address}</p>
                </div>
              )}
            </div>

            {/* Medical Dossier Card */}
            <div className={`${THEME.glass.card} p-6 border border-white/5 space-y-5`}>
              <h3 className="text-sm font-bold text-slate-200 border-b border-white/5 pb-3">Clinical Profile</h3>

              <div className="space-y-4 text-xs">
                {/* Allergies */}
                <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl text-left">
                  <p className="text-red-400 font-bold uppercase tracking-wider text-[9px]">Allergies</p>
                  <p className="text-slate-200 mt-1">
                    {Array.isArray(patient.allergies)
                      ? patient.allergies.join(", ")
                      : patient.allergies || "No documented drug or food allergies"}
                  </p>
                </div>

                {/* Current Medications */}
                <div className="p-3 bg-sky-500/5 border border-sky-500/10 rounded-xl text-left">
                  <p className="text-sky-400 font-bold uppercase tracking-wider text-[9px]">Current Medications</p>
                  <p className="text-slate-200 mt-1">
                    {Array.isArray(patient.currentMedications)
                      ? patient.currentMedications.join(", ")
                      : patient.currentMedications || "No active chronic prescriptions"}
                  </p>
                </div>

                {/* Medical History */}
                <div className="p-3 bg-white/5 border border-white/5 rounded-xl text-left">
                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">Medical History / Diagnoses</p>
                  <p className="text-slate-200 mt-1">
                    {Array.isArray(patient.medicalHistory)
                      ? patient.medicalHistory.join(", ")
                      : patient.medicalHistory || "No past clinical surgical logs"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right panel: Timeline of past visits with this doctor */}
          <div className="space-y-4">
            <div className={`${THEME.glass.card} p-6 border border-white/5 flex flex-col h-full`}>
              <div>
                <h3 className="text-sm font-bold text-slate-200">Consultation History</h3>
                <p className="text-xs text-slate-500 mt-1">Timeline of clinical appointments with you</p>
              </div>

              <div className="mt-6 flex-1 relative border-l border-white/10 pl-4 space-y-6">
                {patientVisits.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">No visits logged</p>
                ) : (
                  patientVisits.map((visit) => {
                    const dateStr = visit.appointmentDate
                      ? new Date(visit.appointmentDate).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric"
                        })
                      : "Date N/A";
                    
                    return (
                      <div key={visit._id} className="relative text-xs">
                        {/* Timeline dot */}
                        <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-sky-500 border-2 border-slate-950"></div>
                        
                        <div>
                          <p className="font-bold text-slate-200">{dateStr}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{visit.startTime} - {visit.endTime}</p>
                          <p className="text-slate-400 mt-1.5 italic font-medium">" {visit.reason} "</p>
                          <span className={`inline-block text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-0.25 rounded border mt-2 ${
                            visit.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-sky-500/10 text-sky-400 border-sky-500/20"
                          }`}>
                            {visit.status}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
