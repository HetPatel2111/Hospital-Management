import React from "react";

export default function RefundTimeline({ status }) {
  const steps = [
    { label: "Requested", key: "requested" },
    { label: "Approved", key: "approved" },
    { label: "Processing", key: "processing" },
    { label: "Refunded", key: "refunded" }
  ];

  const isRejected = status === "rejected";

  const getStepIndex = (currentStatus) => {
    if (currentStatus === "rejected") return 1; // display rejection at step 2
    switch (currentStatus) {
      case "refunded":
        return 3;
      case "processing":
        return 2;
      case "approved":
        return 1;
      case "requested":
      default:
        return 0;
    }
  };

  const activeIndex = getStepIndex(status);

  return (
    <div className="w-full py-4 text-center">
      <div className="flex items-center justify-between max-w-md mx-auto relative">
        {/* Background Connecting Line */}
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white/5 -translate-y-1/2 z-0"></div>

        {/* Active Progress Line */}
        {!isRejected && (
          <div
            className="absolute top-1/2 left-0 h-0.5 bg-sky-500 -translate-y-1/2 z-0 transition-all duration-500"
            style={{ width: `${(activeIndex / (steps.length - 1)) * 100}%` }}
          ></div>
        )}

        {/* Steps mapping */}
        {steps.map((step, idx) => {
          const isCompleted = !isRejected && idx < activeIndex;
          const isActive = idx === activeIndex;
          const isFuture = idx > activeIndex;

          let stepColorClass = "bg-slate-950 border-white/10 text-slate-500";
          let labelColorClass = "text-slate-500";

          if (isActive) {
            if (isRejected && step.key === "approved") {
              stepColorClass = "bg-red-500/10 border-red-500 text-red-400 font-bold scale-110 shadow-lg shadow-red-500/10";
              labelColorClass = "text-red-400 font-bold";
            } else {
              stepColorClass = "bg-sky-500/10 border-sky-500 text-sky-400 font-bold scale-110 shadow-lg shadow-sky-500/10";
              labelColorClass = "text-sky-400 font-bold";
            }
          } else if (isCompleted) {
            stepColorClass = "bg-sky-500 border-sky-500 text-white";
            labelColorClass = "text-slate-300 font-semibold";
          }

          const displayLabel = isRejected && step.key === "approved" ? "Rejected" : step.label;

          return (
            <div key={step.key} className="flex flex-col items-center relative z-10">
              {/* Step indicator dot */}
              <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs transition-all duration-300 ${stepColorClass}`}>
                {isCompleted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                ) : isRejected && step.key === "approved" && isActive ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              
              {/* Label */}
              <span className={`text-[10px] uppercase font-bold tracking-wider mt-2 transition-colors duration-300 ${labelColorClass}`}>
                {displayLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
