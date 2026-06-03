import React from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getDoctorById } from "../../services/doctorService.js";
import { DetailSkeleton } from "../../components/Skeletons.jsx";
import { THEME } from "../../theme/index.js";
import { ROUTES } from "../../constants/routes.js";

export default function DoctorDetail() {
  const { doctorId } = useParams();
  const navigate = useNavigate();

  // 1. Fetch doctor details
  const { data: doctorData, isLoading, error } = useQuery({
    queryKey: ["doctorDetails", doctorId],
    queryFn: () => getDoctorById(doctorId),
    enabled: !!doctorId,
  });

  const doctor = doctorData?.data?.doctor || {};

  const getDayName = (dayNum) => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[dayNum] || "Unknown";
  };

  const handleBookAppointment = () => {
    // Redirect to appointments page with doctorId query parameter
    navigate(`${ROUTES.PATIENT_APPOINTMENTS}?doctorId=${doctor.id}`);
  };

  if (isLoading) {
    return (
      <div className={`p-6 ${THEME.glass.card}`}>
        <DetailSkeleton />
      </div>
    );
  }

  if (error || !doctorData?.success) {
    return (
      <div className={`p-8 text-center ${THEME.glass.card} max-w-md mx-auto`}>
        <div className="text-red-400 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 mx-auto">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-200">Doctor Profile Not Found</h3>
        <p className="text-sm text-slate-400 mt-2">The requested doctor record does not exist or has been removed.</p>
        <Link to={ROUTES.PATIENT_APPOINTMENTS} className={`inline-block mt-6 px-5 py-2.5 ${THEME.glass.buttonPrimary}`}>
          Back to Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back button */}
      <div>
        <Link
          to={ROUTES.PATIENT_APPOINTMENTS}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
          </svg>
          Back to Directory
        </Link>
      </div>

      {/* Doctor Header card */}
      <div className={`p-6 ${THEME.glass.card} flex flex-col md:flex-row gap-6 items-start md:items-center justify-between`}>
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-2xl flex-shrink-0">
            {doctor.fullName?.charAt(0).toUpperCase() || "D"}
          </div>
          <div className="text-left">
            <h1 className="text-2xl font-bold text-slate-50">{doctor.fullName}</h1>
            <p className="text-sm text-sky-400 font-semibold">{doctor.specialization}</p>
            <p className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{doctor.qualification?.join(" • ")}</p>
          </div>
        </div>

        <button onClick={handleBookAppointment} className={`w-full md:w-auto px-6 py-3.5 ${THEME.glass.buttonPrimary}`}>
          Book Appointment
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Biography and Qualification Details */}
        <div className="lg:col-span-2 space-y-6 text-left">
          {/* Bio */}
          <div className={`p-6 ${THEME.glass.card}`}>
            <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wider mb-3">About Doctor</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              {doctor.bio || "No professional biography is currently listed for this doctor."}
            </p>
          </div>

          {/* Core metadata details */}
          <div className={`p-6 ${THEME.glass.card} grid grid-cols-2 md:grid-cols-3 gap-4`}>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Experience</span>
              <p className="text-sm font-semibold text-slate-200 mt-1">{doctor.experienceYears} Years Active</p>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Consultation Fee</span>
              <p className="text-sm font-semibold text-slate-200 mt-1">${doctor.consultationFee}</p>
            </div>
            <div className="col-span-2 md:col-span-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Registration Number</span>
              <p className="text-sm font-semibold text-slate-200 mt-1">{doctor.registrationNumber}</p>
            </div>
          </div>
        </div>

        {/* Right 1 Col: Weekly Shift Availability */}
        <div className={`p-6 ${THEME.glass.card} h-fit text-left`}>
          <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wider mb-4">Availability Schedule</h3>
          
          <div className="space-y-3.5">
            {!doctor.availability?.weeklySchedule || doctor.availability.weeklySchedule.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No weekly shifts configured.</p>
            ) : (
              doctor.availability.weeklySchedule
                .filter((sched) => sched.isAvailable)
                .map((sched) => (
                  <div key={sched.dayOfWeek} className="flex justify-between items-start border-b border-white/5 pb-2.5 last:border-0 last:pb-0">
                    <span className="text-xs font-semibold text-slate-300">{getDayName(sched.dayOfWeek)}</span>
                    <div className="space-y-1 text-right">
                      {sched.slots.map((slot, sIdx) => (
                        <span key={sIdx} className="inline-block text-[10px] font-medium px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 mr-1 last:mr-0">
                          {slot.startTime} - {slot.endTime}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
