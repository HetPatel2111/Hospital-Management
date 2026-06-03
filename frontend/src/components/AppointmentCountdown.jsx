import React, { useState, useEffect } from "react";

export default function AppointmentCountdown({ appointments }) {
  const [timeLeft, setTimeLeft] = useState(null);
  const [nextAppointment, setNextAppointment] = useState(null);

  useEffect(() => {
    if (!appointments || appointments.length === 0) {
      setTimeLeft(null);
      setNextAppointment(null);
      return;
    }

    const now = new Date();
    
    // Find the next upcoming confirmed or pending appointment in the future
    const upcoming = appointments
      .filter((appt) => {
        if (appt.status !== "confirmed" && appt.status !== "pending") return false;
        const apptDateStr = `${new Date(appt.appointmentDate).toISOString().split("T")[0]}T${appt.startTime}:00`;
        const apptTime = new Date(apptDateStr);
        return apptTime > now;
      })
      .sort((a, b) => {
        const dateA = new Date(`${new Date(a.appointmentDate).toISOString().split("T")[0]}T${a.startTime}:00`);
        const dateB = new Date(`${new Date(b.appointmentDate).toISOString().split("T")[0]}T${b.startTime}:00`);
        return dateA - dateB;
      })[0];

    if (!upcoming) {
      setTimeLeft(null);
      setNextAppointment(null);
      return;
    }

    setNextAppointment(upcoming);

    const apptDateStr = `${new Date(upcoming.appointmentDate).toISOString().split("T")[0]}T${upcoming.startTime}:00`;
    const apptTime = new Date(apptDateStr);

    const updateCountdown = () => {
      const difference = apptTime.getTime() - new Date().getTime();

      if (difference <= 0) {
        setTimeLeft(null);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds, raw: difference });
    };

    updateCountdown();
    const intervalId = setInterval(updateCountdown, 1000);

    return () => clearInterval(intervalId);
  }, [appointments]);

  if (!timeLeft || !nextAppointment) return null;

  const isUrgent = timeLeft.raw < 24 * 60 * 60 * 1000; // Less than 24 hours

  return (
    <div className={`p-5 rounded-2xl border ${
      isUrgent 
        ? "bg-amber-500/10 border-amber-500/20 text-amber-200" 
        : "bg-sky-500/5 border-sky-500/10 text-sky-200"
    } flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full backdrop-blur-md`}>
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${
          isUrgent ? "bg-amber-500/20 text-amber-400" : "bg-sky-500/15 text-sky-400"
        } flex-shrink-0 animate-pulse`}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Next Consult Countdown</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            With <span className="font-semibold text-slate-300">{nextAppointment.doctor?.fullName || "Assigned Doctor"}</span> ({nextAppointment.doctor?.specialization})
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 font-mono text-center self-stretch md:self-auto justify-center">
        {timeLeft.days > 0 && (
          <div className="bg-slate-950/60 border border-white/5 rounded-xl px-3 py-1.5 min-w-[3.5rem]">
            <p className="text-lg font-bold text-slate-100">{timeLeft.days}</p>
            <p className="text-[9px] uppercase text-slate-500">Days</p>
          </div>
        )}
        <div className="bg-slate-950/60 border border-white/5 rounded-xl px-3 py-1.5 min-w-[3.5rem]">
          <p className="text-lg font-bold text-slate-100">{timeLeft.hours.toString().padStart(2, "0")}</p>
          <p className="text-[9px] uppercase text-slate-500">Hours</p>
        </div>
        <div className="bg-slate-950/60 border border-white/5 rounded-xl px-3 py-1.5 min-w-[3.5rem]">
          <p className="text-lg font-bold text-slate-100">{timeLeft.minutes.toString().padStart(2, "0")}</p>
          <p className="text-[9px] uppercase text-slate-500">Mins</p>
        </div>
        <div className="bg-slate-950/60 border border-white/5 rounded-xl px-3 py-1.5 min-w-[3.5rem]">
          <p className={`text-lg font-bold ${isUrgent ? "text-amber-400" : "text-sky-400"}`}>
            {timeLeft.seconds.toString().padStart(2, "0")}
          </p>
          <p className="text-[9px] uppercase text-slate-500">Secs</p>
        </div>
      </div>
    </div>
  );
}
