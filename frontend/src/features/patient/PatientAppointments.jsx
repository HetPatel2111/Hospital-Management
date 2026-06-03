import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAppointments, getMyProfile } from "../../services/patientService.js";
import { getDoctors, getDoctorAvailability } from "../../services/doctorService.js";
import { createAppointment, cancelAppointment, rescheduleAppointment } from "../../services/appointmentService.js";
import { createPaymentOrder, verifyPayment } from "../../services/paymentService.js";
import { requestRefund as requestPatientRefund } from "../../services/refundService.js";
import { ListItemSkeleton } from "../../components/Skeletons.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import AppointmentDetailsModal from "../../components/AppointmentDetailsModal.jsx";
import RefundRequestModal from "../../components/RefundRequestModal.jsx";
import { THEME } from "../../theme/index.js";
import { ROUTES } from "../../constants/routes.js";

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const getNext7Days = (doctor) => {
  const days = [];
  const today = new Date();
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const dateVal = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${dateVal}`;
    const dayOfWeek = new Date(dateStr).getUTCDay();
    
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
    const dayNum = d.toLocaleDateString("en-US", { day: "2-digit" });
    
    let isAvailable = true;
    if (doctor?.availability?.weeklySchedule) {
      const weekSched = doctor.availability.weeklySchedule.find(w => w.dayOfWeek === dayOfWeek);
      isAvailable = !!(weekSched && weekSched.isAvailable && weekSched.slots?.length > 0);
      
      if (isAvailable && doctor?.availability?.exceptions) {
        const exception = doctor.availability.exceptions.find(e => {
          const exceptionDateStr = new Date(e.date).toISOString().split("T")[0];
          return exceptionDateStr === dateStr;
        });
        if (exception && !exception.isAvailable && !exception.startTime && !exception.endTime) {
          isAvailable = false;
        }
      }
    }
    
    days.push({
      dateStr,
      dayName,
      dayNum,
      isAvailable
    });
  }
  return days;
};

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

  // Payment integration states
  const [paymentError, setPaymentError] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [successToast, setSuccessToast] = useState(null);

  // Refund states & handlers
  const [refundTargetAppt, setRefundTargetAppt] = useState(null);

  const handleRefundSubmit = async (appointmentId, reason) => {
    try {
      setIsProcessingPayment(true);
      await requestPatientRefund(appointmentId, reason);
      
      queryClient.invalidateQueries(["patientAppointments"]);
      queryClient.invalidateQueries(["patientDashboard"]);
      queryClient.invalidateQueries(["patientRefunds"]);
      setRefundTargetAppt(null);

      setSuccessToast({
        title: "Refund Requested",
        message: "Your refund request was successfully submitted!"
      });
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err) {
      setPaymentError(err.response?.data?.message || "Failed to submit refund request.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "confirmed":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "completed":
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
      case "cancelled":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "refunded":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "payment_completed":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "pending_payment":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "pending":
      default:
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    }
  };

  const handlePaymentFlow = async (appt) => {
    setPaymentError("");
    setIsProcessingPayment(true);
    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setPaymentError("Failed to load Razorpay Payment Gateway. Check your network.");
        setIsProcessingPayment(false);
        return;
      }

      // Create order on backend
      const orderRes = await createPaymentOrder(appt.id);
      const orderData = orderRes.data;

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "AI Hospital Management",
        description: `Consultation Fee - Dr. ${appt.doctor?.fullName}`,
        order_id: orderData.orderId,
        prefill: {
          name: profileData?.data?.patient?.userId?.name || "",
          email: profileData?.data?.patient?.userId?.email || "",
          contact: profileData?.data?.patient?.userId?.phone || ""
        },
        theme: {
          color: "#0ea5e9"
        },
        handler: async function (response) {
          setIsProcessingPayment(true);
          try {
            await verifyPayment({
              appointmentId: appt.id,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              paymentMethod: "razorpay",
              gatewayResponse: response
            });

            // Success state invalidations
            queryClient.invalidateQueries(["patientAppointments"]);
            queryClient.invalidateQueries(["patientDashboard"]);
            queryClient.invalidateQueries(["patientPayments"]);
            setSelectedAppointment(null);

            setSuccessToast({
              title: "Payment Confirmed",
              message: "Your consultation has been booked and paid successfully!"
            });

            setTimeout(() => setSuccessToast(null), 4000);
          } catch (err) {
            setPaymentError(err.response?.data?.message || "Failed to verify transaction payment.");
          } finally {
            setIsProcessingPayment(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessingPayment(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      setPaymentError(err.response?.data?.message || "Could not initialize payment order.");
      setIsProcessingPayment(false);
    }
  };

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
  const targetDoctorId = bookingDoctor?.id || reschedulingAppt?.doctor?.id;
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
      const doc = doctorsList.find((d) => d.id === doctorId);
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
      doctorId: bookingDoctor.id,
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
                    <span className={`inline-block mt-2 text-[9px] font-bold border px-2 py-0.5 rounded-full uppercase ${getStatusBadgeClass(appt.status)}`}>
                      {appt.status?.replace("_", " ")}
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
                    <span className={`inline-block mt-2 text-[9px] font-bold border px-2 py-0.5 rounded-full uppercase ${getStatusBadgeClass(appt.status)}`}>
                      {appt.status?.replace("_", " ")}
                    </span>
                  </div>
                </div>

                <div className="text-left md:text-right">
                  <p className="text-xs font-semibold text-slate-300">
                    {new Date(appt.appointmentDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">{appt.startTime} - {appt.endTime}</p>
                </div>

                <div className="flex gap-2 w-full md:w-auto" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => setSelectedAppointment(appt)}
                    className="flex-1 md:flex-none text-xs font-semibold px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-colors"
                  >
                    Inspect Details
                  </button>
                  {appt.status === "cancelled" && appt.paymentId && (
                    <button
                      onClick={() => setRefundTargetAppt(appt)}
                      className="flex-1 md:flex-none text-xs font-semibold px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                    >
                      Request Refund
                    </button>
                  )}
                </div>
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
              placeholder="Search by name, specialization, or issue (e.g., cardilogistic)..."
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
                <div key={doc.id} className={`p-5 ${THEME.glass.card} flex flex-col justify-between gap-5 text-left`}>
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
                        onClick={() => navigate(`/patient/doctors/${doc.id}`)}
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
          onPayClick={handlePaymentFlow}
        />
      )}

      {/* PROCESSING PAYMENT OVERLAY */}
      {isProcessingPayment && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500 mb-4"></div>
          <p className="text-sm font-semibold text-slate-200">Verifying Payment Security...</p>
          <p className="text-xs text-slate-400 mt-1">Please do not close this window or navigate away.</p>
        </div>
      )}

      {/* SUCCESS TOAST OVERLAY */}
      {successToast && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500 text-white font-medium shadow-2xl">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
            </svg>
            <div className="text-left">
              <p className="text-xs font-bold uppercase tracking-wider">{successToast.title}</p>
              <p className="text-[10px] text-white/90 mt-0.5">{successToast.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT ERROR TOAST OVERLAY */}
      {paymentError && (
        <div className="fixed bottom-5 left-5 z-50">
          <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/90 text-white font-medium shadow-2xl max-w-sm">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
            <div className="text-left flex-1">
              <p className="text-xs font-bold uppercase tracking-wider">Payment Error</p>
              <p className="text-[10px] text-white/90 mt-0.5">{paymentError}</p>
            </div>
            <button onClick={() => setPaymentError("")} className="text-white hover:text-white/80 font-bold p-1">×</button>
          </div>
        </div>
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
                
                {/* 7-Day Quick Selector */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {getNext7Days(
                    doctorsList.find(d => d.id === (reschedulingAppt?.doctor?.id || reschedulingAppt?.doctorId)) || reschedulingAppt?.doctor
                  ).map((day, idx) => {
                    const isSelected = bookDate === day.dateStr;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setBookDate(day.dateStr);
                          setBookSlot(null);
                        }}
                        className={`flex-shrink-0 flex flex-col items-center justify-center w-14 py-2 rounded-xl border transition-all ${
                          isSelected
                            ? "bg-sky-500 text-white border-sky-500 shadow shadow-sky-500/20"
                            : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        <span className="text-[10px] uppercase font-semibold opacity-70">{day.dayName}</span>
                        <span className="text-sm font-bold my-0.5">{day.dayNum}</span>
                        <span className={`w-1.5 h-1.5 rounded-full mt-1 ${day.isAvailable ? "bg-emerald-400" : "bg-slate-600 opacity-40"}`} title={day.isAvailable ? "Available" : "No hours schedule"} />
                      </button>
                    );
                  })}
                </div>

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
                    <div className="space-y-4 max-h-56 overflow-y-auto p-1">
                      {/* Morning Shift */}
                      {slotsList.some(s => s.startTime < "13:00") && (
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Morning Shift (10:00 AM - 1:00 PM)</span>
                          <div className="grid grid-cols-2 gap-2">
                            {slotsList.filter(s => s.startTime < "13:00").map((slot, idx) => (
                              <button
                                key={`resched-morning-${idx}`}
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
                        </div>
                      )}

                      {/* Afternoon / Evening Shift */}
                      {slotsList.some(s => s.startTime >= "13:00") && (
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Afternoon / Evening Shift (2:00 PM - 6:00 PM)</span>
                          <div className="grid grid-cols-2 gap-2">
                            {slotsList.filter(s => s.startTime >= "13:00").map((slot, idx) => (
                              <button
                                key={`resched-afternoon-${idx}`}
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
                        </div>
                      )}
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
                
                {/* 7-Day Quick Selector */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {getNext7Days(bookingDoctor).map((day, idx) => {
                    const isSelected = bookDate === day.dateStr;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setBookDate(day.dateStr);
                          setBookSlot(null);
                        }}
                        className={`flex-shrink-0 flex flex-col items-center justify-center w-14 py-2 rounded-xl border transition-all ${
                          isSelected
                            ? "bg-sky-500 text-white border-sky-500 shadow shadow-sky-500/20"
                            : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        <span className="text-[10px] uppercase font-semibold opacity-70">{day.dayName}</span>
                        <span className="text-sm font-bold my-0.5">{day.dayNum}</span>
                        <span className={`w-1.5 h-1.5 rounded-full mt-1 ${day.isAvailable ? "bg-emerald-400" : "bg-slate-600 opacity-40"}`} title={day.isAvailable ? "Available" : "No hours schedule"} />
                      </button>
                    );
                  })}
                </div>

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
                    <div className="space-y-4 max-h-56 overflow-y-auto p-1">
                      {/* Morning Shift */}
                      {slotsList.some(s => s.startTime < "13:00") && (
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Morning Shift (10:00 AM - 1:00 PM)</span>
                          <div className="grid grid-cols-3 gap-2">
                            {slotsList.filter(s => s.startTime < "13:00").map((slot, idx) => (
                              <button
                                key={`morning-${idx}`}
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
                        </div>
                      )}

                      {/* Afternoon / Evening Shift */}
                      {slotsList.some(s => s.startTime >= "13:00") && (
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Afternoon / Evening Shift (2:00 PM - 6:00 PM)</span>
                          <div className="grid grid-cols-3 gap-2">
                            {slotsList.filter(s => s.startTime >= "13:00").map((slot, idx) => (
                              <button
                                key={`afternoon-${idx}`}
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
                        </div>
                      )}
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
      {/* MODAL 5: Refund Request Modal */}
      {refundTargetAppt && (
        <RefundRequestModal
          appointment={refundTargetAppt}
          onClose={() => setRefundTargetAppt(null)}
          onSubmit={handleRefundSubmit}
        />
      )}
    </div>
  );
}
