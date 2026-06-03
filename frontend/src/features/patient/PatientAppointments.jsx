import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAppointments, getMyProfile } from "../../services/patientService.js";
import { getDoctors, getDoctorAvailability } from "../../services/doctorService.js";
import { createAppointment, cancelAppointment, rescheduleAppointment } from "../../services/appointmentService.js";
import { ListItemSkeleton } from "../../components/Skeletons.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import AppointmentDetailsModal from "../../components/AppointmentDetailsModal.jsx";
import { THEME } from "../../theme/index.js";
import { ROUTES } from "../../constants/routes.js";

export default function PatientAppointments() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab: "upcoming" | "history" | "directory"
  const [activeTab, setActiveTab] = useState("upcoming");

  // Search & Filters for Doctor Directory
  const [searchQuery, setSearchQuery] = useState("");
  const [specFilter, setSpecFilter] = useState("");

  // Modals state
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [bookingDoctor, setBookingDoctor] = useState(null);
  const [reschedulingAppt, setReschedulingAppt] = useState(null);
  const [cancellingAppt, setCancellingAppt] = useState(null);

  // Form states for Book / Reschedule
  const [bookDate, setBookDate] = useState("");
  const [bookSlot, setBookSlot] = useState(null); // { startTime, endTime }
  const [bookReason, setBookReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [bookingError, setBookingError] = useState("");

  // Get current patient profile to pass patient ID if needed
  const { data: profileData } = useQuery({
    queryKey: ["patientProfile"],
    queryFn: getMyProfile,
  });

  // 1. Fetch appointments lists (React Query)
  const { data: upcomingData, isLoading: upcomingLoading } = useQuery({
    queryKey: ["patientAppointments", "upcoming"],
    queryFn: () => getAppointments("upcoming"),
    enabled: activeTab === "upcoming",
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ["patientAppointments", "history"],
    queryFn: () => getAppointments("history"),
    enabled: activeTab === "history",
  });

  // 2. Fetch approved doctors
  const { data: doctorsData, isLoading: doctorsLoading } = useQuery({
    queryKey: ["doctors", { search: searchQuery, specialization: specFilter }],
    queryFn: () => getDoctors({ search: searchQuery, specialization: specFilter }),
    enabled: activeTab === "directory" || !!bookingDoctor,
  });

  // 3. Fetch doctor availability slots (based on selected doctor & date)
  const targetDoctorId = bookingDoctor?._id || reschedulingAppt?.doctor?.id;
  const { data: availabilityData, isLoading: slotsLoading } = useQuery({
    queryKey: ["availability", targetDoctorId, bookDate],
    queryFn: () => getDoctorAvailability(targetDoctorId, bookDate),
    enabled: !!targetDoctorId && !!bookDate,
  });

  const upcomingAppts = upcomingData?.data?.appointments || [];
  const historyAppts = historyData?.data?.appointments || [];
  const doctorsList = doctorsData?.data?.doctors || [];
  const slotsList = availabilityData?.data?.slots || [];

  // Check URL query parameters for pre-selected booking doctor
  useEffect(() => {
    const doctorId = searchParams.get("doctorId");
    if (doctorId && doctorsList.length > 0) {
      const doc = doctorsList.find((d) => d._id === doctorId);
      if (doc) {
        setBookingDoctor(doc);
        setActiveTab("directory");
        // Clear query parameters
        setSearchParams({});
      }
    }
  }, [searchParams, doctorsList]);

  // Mutations
  const bookMutation = useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries(["patientAppointments"]);
      queryClient.invalidateQueries(["patientDashboard"]);
      setBookingDoctor(null);
      resetBookingForm();
      setActiveTab("upcoming");
    },
    onError: (err) => {
      setBookingError(err.response?.data?.message || "Booking failed. Choose another slot.");
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: ({ id, payload }) => rescheduleAppointment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["patientAppointments"]);
      setReschedulingAppt(null);
      resetBookingForm();
    },
    onError: (err) => {
      setBookingError(err.response?.data?.message || "Rescheduling failed.");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }) => cancelAppointment(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(["patientAppointments"]);
      queryClient.invalidateQueries(["patientDashboard"]);
      setCancellingAppt(null);
      setCancelReason("");
    },
  });

  const resetBookingForm = () => {
    setBookDate("");
    setBookSlot(null);
    setBookReason("");
    setBookingError("");
  };

  const handleBookSubmit = (e) => {
    e.preventDefault();
    if (!bookSlot) {
      setBookingError("Please select a time slot.");
      return;
    }
    setBookingError("");

    const payload = {
      doctorId: bookingDoctor._id,
      appointmentDate: bookDate,
      startTime: bookSlot.startTime,
      endTime: bookSlot.endTime,
      reason: bookReason.trim(),
    };

    bookMutation.mutate(payload);
  };

  const handleRescheduleSubmit = (e) => {
    e.preventDefault();
    if (!bookSlot) {
      setBookingError("Please select a time slot.");
      return;
    }
    setBookingError("");

    const payload = {
      appointmentDate: bookDate,
      startTime: bookSlot.startTime,
      endTime: bookSlot.endTime,
    };

    rescheduleMutation.mutate({ id: reschedulingAppt.id, payload });
  };

  const handleCancelSubmit = (e) => {
    e.preventDefault();
    cancelMutation.mutate({ id: cancellingAppt.id, reason: cancelReason.trim() });
  };

  // Specializations listing
  const specializations = [
    "Cardiology", "Dermatology", "Pediatrics", "Orthopedics",
    "General Medicine", "Neurology", "Oncology", "Gynecology",
    "Psychiatry", "Radiology"
  ];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-left">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-50 tracking-tight">Appointments Ledger</h1>
          <p className="text-sm text-slate-400 mt-1">Book consultations, reschedule slots, and inspect prescriptions</p>
        </div>
        <button
          onClick={() => setActiveTab("directory")}
          className={`py-3 px-5 text-sm font-semibold tracking-wide uppercase ${THEME.glass.buttonPrimary}`}
        >
          Book New Consultation
        </button>
      </div>

      {/* Tabs Menu */}
      <div className="border-b border-white/5 flex gap-2">
        <button
          onClick={() => { setActiveTab("upcoming"); resetBookingForm(); }}
          className={`py-3.5 px-6 text-sm font-medium border-b-2 transition-all ${
            activeTab === "upcoming"
              ? "border-sky-500 text-sky-400 font-bold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Upcoming Bookings
        </button>
        <button
          onClick={() => { setActiveTab("history"); resetBookingForm(); }}
          className={`py-3.5 px-6 text-sm font-medium border-b-2 transition-all ${
            activeTab === "history"
              ? "border-sky-500 text-sky-400 font-bold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Past History & Records
        </button>
        <button
          onClick={() => { setActiveTab("directory"); resetBookingForm(); }}
          className={`py-3.5 px-6 text-sm font-medium border-b-2 transition-all ${
            activeTab === "directory"
              ? "border-sky-500 text-sky-400 font-bold"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Find Doctors
        </button>
      </div>

      {/* Content tabs rendering */}
      {activeTab === "upcoming" && (
        <div className="space-y-4">
          {upcomingLoading ? (
            Array.from({ length: 3 }).map((_, i) => <ListItemSkeleton key={i} />)
          ) : upcomingAppts.length === 0 ? (
            <EmptyState
              title="No Upcoming Bookings"
              description="You do not have any pending or confirmed appointments booked."
              iconType="appointments"
              actionLabel="Book a consultation"
              onActionClick={() => setActiveTab("directory")}
            />
          ) : (
            upcomingAppts.map((appt) => (
              <div
                key={appt.id}
                onClick={() => setSelectedAppointment(appt)}
                className="p-5 rounded-2xl border border-white/5 bg-slate-900/40 hover:border-sky-500/20 hover:bg-slate-900/50 cursor-pointer transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
                    {appt.doctor?.fullName?.charAt(0).toUpperCase() || "D"}
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-bold text-slate-100">{appt.doctor?.fullName}</h4>
                    <p className="text-xs text-sky-400 font-medium">{appt.doctor?.specialization}</p>
                    <span className="inline-block mt-2 text-[9px] font-bold border border-amber-500/20 bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full uppercase">
                      {appt.status}
                    </span>
                  </div>
                </div>

                <div className="text-left md:text-right">
                  <p className="text-xs font-semibold text-slate-200">
                    {new Date(appt.appointmentDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">{appt.startTime} - {appt.endTime}</p>
                </div>

                <div className="flex gap-2 w-full md:w-auto" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setReschedulingAppt(appt)}
                    className="flex-1 md:flex-none text-xs font-semibold px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-colors"
                  >
                    Reschedule
                  </button>
                  <button
                    onClick={() => setCancellingAppt(appt)}
                    className="flex-1 md:flex-none text-xs font-semibold px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-4">
          {historyLoading ? (
            Array.from({ length: 3 }).map((_, i) => <ListItemSkeleton key={i} />)
          ) : historyAppts.length === 0 ? (
            <EmptyState
              title="No Past History Records"
              description="There are no completed or cancelled consultation summaries in your ledger."
              iconType="appointments"
            />
          ) : (
            historyAppts.map((appt) => (
              <div
                key={appt.id}
                onClick={() => setSelectedAppointment(appt)}
                className="p-5 rounded-2xl border border-white/5 bg-slate-900/40 hover:bg-slate-900/50 cursor-pointer transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 text-slate-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
                    {appt.doctor?.fullName?.charAt(0).toUpperCase() || "D"}
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-bold text-slate-200">{appt.doctor?.fullName}</h4>
                    <p className="text-xs text-slate-500">{appt.doctor?.specialization}</p>
                    <span className={`inline-block mt-2 text-[9px] font-bold border px-2 py-0.5 rounded-full uppercase ${
                      appt.status === "completed" 
                        ? "bg-sky-500/10 text-sky-400 border-sky-500/20" 
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}>
                      {appt.status}
                    </span>
                  </div>
                </div>

                <div className="text-left md:text-right">
                  <p className="text-xs font-semibold text-slate-300">
                    {new Date(appt.appointmentDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">{appt.startTime} - {appt.endTime}</p>
                </div>

                <button className="w-full md:w-auto text-xs font-semibold px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300">
                  Inspect File
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "directory" && (
        <div className="space-y-6">
          {/* Search filters toolbar */}
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Search doctors by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`flex-1 px-4 py-3 text-sm ${THEME.glass.input}`}
            />
            <select
              value={specFilter}
              onChange={(e) => setSpecFilter(e.target.value)}
              className={`px-4 py-3 text-sm ${THEME.glass.input} min-w-[200px] appearance-none`}
            >
              <option value="">All Specializations</option>
              {specializations.map((spec) => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>

          {/* List of Doctors */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {doctorsLoading ? (
              Array.from({ length: 4 }).map((_, i) => <ListItemSkeleton key={i} />)
            ) : doctorsList.length === 0 ? (
              <div className="col-span-2">
                <EmptyState
                  title="No Practitioners Found"
                  description="No registered practitioners match your search terms or specializations."
                  iconType="doctors"
                />
              </div>
            ) : (
              doctorsList.map((doc) => (
                <div key={doc._id} className={`p-5 ${THEME.glass.card} flex flex-col justify-between gap-5 text-left`}>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-lg flex-shrink-0">
                      {doc.fullName?.charAt(0).toUpperCase() || "D"}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-100 text-sm">{doc.fullName}</h4>
                      <p className="text-xs text-sky-400 mt-0.5">{doc.specialization}</p>
                      <p className="text-[10px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">{doc.bio || "No biography details listed."}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-2">
                    <div className="text-left">
                      <span className="text-[9px] uppercase font-semibold text-slate-500 block">Fee per visit</span>
                      <span className="text-md font-bold text-slate-200">${doc.consultationFee}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/patient/doctors/${doc._id}`)}
                        className="text-xs font-semibold px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-colors"
                      >
                        Profile
                      </button>
                      <button
                        onClick={() => setBookingDoctor(doc)}
                        className={`text-xs font-semibold px-4 py-2.5 ${THEME.glass.buttonPrimary}`}
                      >
                        Book Consult
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: View Appointment Details */}
      {selectedAppointment && (
        <AppointmentDetailsModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onCancelClick={(appt) => setCancellingAppt(appt)}
          onRescheduleClick={(appt) => setReschedulingAppt(appt)}
        />
      )}

      {/* MODAL 2: Reschedule Appointment Modal */}
      {reschedulingAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setReschedulingAppt(null)}></div>
          <div className={`w-full max-w-md p-6 relative z-10 ${THEME.glass.card}`}>
            <h3 className="text-lg font-bold text-slate-100 mb-2">Reschedule Consultation</h3>
            <p className="text-xs text-slate-400 mb-5">Change visit timings with Dr. {reschedulingAppt.doctor?.fullName}</p>
            
            {bookingError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {bookingError}
              </div>
            )}

            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Select Date</label>
                <input
                  type="date"
                  value={bookDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => { setBookDate(e.target.value); setBookSlot(null); }}
                  className={`w-full px-4 py-2.5 text-sm ${THEME.glass.input}`}
                  required
                />
              </div>

              {bookDate && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Available Slots</label>
                  {slotsLoading ? (
                    <p className="text-xs text-slate-500 animate-pulse">Loading availability calendar...</p>
                  ) : slotsList.length === 0 ? (
                    <p className="text-xs text-red-400">Doctor has no available slots for this date.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 bg-slate-950/40 rounded-xl border border-white/5">
                      {slotsList.map((slot, idx) => (
                        <button
                          key={idx}
                          type="button"
                          disabled={!slot.available}
                          onClick={() => setBookSlot({ startTime: slot.startTime, endTime: slot.endTime })}
                          className={`p-2 text-xs rounded-lg font-medium border transition-all ${
                            !slot.available
                              ? "opacity-30 cursor-not-allowed bg-transparent border-transparent text-slate-500"
                              : bookSlot?.startTime === slot.startTime
                                ? "bg-sky-500 text-white border-sky-500 shadow shadow-sky-500/20"
                                : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                          }`}
                        >
                          {slot.startTime}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setReschedulingAppt(null)}
                  className="flex-1 py-2.5 bg-white/5 border border-white/10 text-slate-300 text-xs uppercase tracking-wider font-semibold rounded-xl"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={rescheduleMutation.isPending}
                  className={`flex-1 py-2.5 ${THEME.glass.buttonPrimary}`}
                >
                  {rescheduleMutation.isPending ? "Updating..." : "Reschedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Cancel Appointment Modal */}
      {cancellingAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setCancellingAppt(null)}></div>
          <div className={`w-full max-w-md p-6 relative z-10 ${THEME.glass.card}`}>
            <h3 className="text-lg font-bold text-slate-100 mb-2">Cancel Appointment</h3>
            <p className="text-xs text-slate-400 mb-5">Are you sure you want to cancel the booking with Dr. {cancellingAppt.doctor?.fullName}?</p>
            
            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Reason for Cancellation</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows="3"
                  className={`w-full px-4 py-2.5 text-xs ${THEME.glass.input} resize-none`}
                  placeholder="Tell us why you are cancelling..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCancellingAppt(null)}
                  className="flex-1 py-2.5 bg-white/5 border border-white/10 text-slate-300 text-xs uppercase tracking-wider font-semibold rounded-xl"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={cancelMutation.isPending}
                  className="flex-1 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs uppercase tracking-wider font-semibold rounded-xl"
                >
                  {cancelMutation.isPending ? "Cancelling..." : "Confirm Cancel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Booking Wizard Modal */}
      {bookingDoctor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => { setBookingDoctor(null); resetBookingForm(); }}></div>
          <div className={`w-full max-w-md p-6 relative z-10 ${THEME.glass.card}`}>
            <h3 className="text-lg font-bold text-slate-100 mb-2">Schedule Consultation</h3>
            <p className="text-xs text-sky-400 mb-5">With Dr. {bookingDoctor.fullName} ({bookingDoctor.specialization})</p>

            {bookingError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-left">
                {bookingError}
              </div>
            )}

            <form onSubmit={handleBookSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Select Visit Date</label>
                <input
                  type="date"
                  value={bookDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => { setBookDate(e.target.value); setBookSlot(null); }}
                  className={`w-full px-4 py-2.5 text-sm ${THEME.glass.input}`}
                  required
                />
              </div>

              {bookDate && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Available Slots</label>
                  {slotsLoading ? (
                    <p className="text-xs text-slate-500 animate-pulse">Loading availability calendar...</p>
                  ) : slotsList.length === 0 ? (
                    <p className="text-xs text-red-400 text-left">Doctor has no available slots for this date.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1 bg-slate-950/40 rounded-xl border border-white/5">
                      {slotsList.map((slot, idx) => (
                        <button
                          key={idx}
                          type="button"
                          disabled={!slot.available}
                          onClick={() => setBookSlot({ startTime: slot.startTime, endTime: slot.endTime })}
                          className={`p-2 text-[10px] rounded-lg font-semibold border transition-all ${
                            !slot.available
                              ? "opacity-30 cursor-not-allowed bg-transparent border-transparent text-slate-500"
                              : bookSlot?.startTime === slot.startTime
                                ? "bg-sky-500 text-white border-sky-500 shadow shadow-sky-500/20"
                                : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                          }`}
                        >
                          {slot.startTime}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Reason for Visit</label>
                <textarea
                  value={bookReason}
                  onChange={(e) => setBookReason(e.target.value)}
                  rows="2"
                  className={`w-full px-4 py-2.5 text-xs ${THEME.glass.input} resize-none`}
                  placeholder="e.g. Regular heart checkup, General malaise"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => { setBookingDoctor(null); resetBookingForm(); }}
                  className="flex-1 py-2.5 bg-white/5 border border-white/10 text-slate-300 text-xs uppercase tracking-wider font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookMutation.isPending}
                  className={`flex-1 py-2.5 ${THEME.glass.buttonPrimary}`}
                >
                  {bookMutation.isPending ? "Reserving..." : "Confirm Book"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
