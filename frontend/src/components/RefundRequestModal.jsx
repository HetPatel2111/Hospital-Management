import React, { useState, useEffect } from "react";
import { THEME } from "../theme/index.js";

export default function RefundRequestModal({ appointment, onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  const [estimate, setEstimate] = useState({ percentage: 0, amount: 0, eligible: true });

  useEffect(() => {
    if (!appointment || !appointment.doctor) return;

    const scheduledTime = new Date(appointment.appointmentDate).getTime();
    const cancellationTime = new Date(appointment.cancellation?.cancelledAt || new Date()).getTime();
    const hoursDiff = (scheduledTime - cancellationTime) / (1000 * 60 * 60);

    const baseAmount = appointment.doctor.consultationFee || 0;

    if (hoursDiff >= 24) {
      setEstimate({ percentage: 100, amount: baseAmount, eligible: true });
    } else if (hoursDiff > 0 && hoursDiff < 24) {
      setEstimate({ percentage: 50, amount: baseAmount * 0.5, eligible: true });
    } else {
      setEstimate({ percentage: 0, amount: 0, eligible: false });
    }
  }, [appointment]);

  if (!appointment) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) return;
    onSubmit(appointment.id, reason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}></div>

      {/* Card */}
      <div className={`w-full max-w-md p-6 relative z-10 ${THEME.glass.card} border border-white/10`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
          <h3 className="font-bold text-slate-100 text-md">Request Consultation Refund</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 hover:bg-white/5 rounded-lg transition-colors outline-none"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Doctor Summary */}
          <div className="p-3.5 rounded-xl bg-slate-950/40 border border-white/5 text-left">
            <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Consultation Summary</span>
            <p className="text-xs font-semibold text-slate-200">Dr. {appointment.doctor?.fullName}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Scheduled for: {new Date(appointment.appointmentDate).toLocaleDateString()} at {appointment.startTime}
            </p>
          </div>

          {/* Refund Estimate Breakdown */}
          <div className="p-4 rounded-xl bg-sky-500/5 border border-sky-500/10 text-left space-y-2">
            <h4 className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">Refund Eligibility Estimate</h4>
            
            {estimate.eligible ? (
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-300">
                  <span>Policy Return Ratio:</span>
                  <span className="text-sky-400">{estimate.percentage}% Refund</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-100 border-t border-white/5 pt-1.5 mt-1.5">
                  <span>Estimated Amount:</span>
                  <span className="text-sky-400 text-sm">₹{estimate.amount}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-2 leading-relaxed">
                  * Note: Return values are permanently locked and logged upon request creation according to our cancellation timelines policy.
                </p>
              </div>
            ) : (
              <div className="p-2 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-semibold">
                This consultation is not eligible for refund returns as cancellation was completed after the slot scheduled start time.
              </div>
            )}
          </div>

          {estimate.eligible && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Reason for Refund Request
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={`w-full px-4 py-3 text-xs ${THEME.glass.input} resize-none`}
                rows="3"
                placeholder="Please describe in detail why you are requesting a refund..."
                required
                minLength={5}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-white/5 border border-white/10 text-slate-300 text-xs font-semibold uppercase tracking-wider rounded-xl hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!estimate.eligible || !reason.trim() || reason.trim().length < 5}
              className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-wider rounded-xl transition-all ${
                estimate.eligible && reason.trim().length >= 5
                  ? THEME.glass.buttonPrimary
                  : "bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed"
              }`}
            >
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
