import React from "react";

// Base pulsating container
const Pulse = ({ className, children }) => (
  <div className={`animate-pulse bg-white/5 rounded-xl ${className}`}>
    {children || <div className="h-full w-full bg-slate-800/40 rounded-xl"></div>}
  </div>
);

// Card Skeleton for Dashboard stats
export const CardSkeleton = () => (
  <Pulse className="p-6 h-28 border border-white/5 flex flex-col justify-between">
    <div className="h-4 w-1/3 bg-slate-700/40 rounded"></div>
    <div className="h-8 w-1/2 bg-slate-700/50 rounded mt-2"></div>
  </Pulse>
);

// List Item Skeleton for Doctors or Appointments
export const ListItemSkeleton = () => (
  <Pulse className="p-5 border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
    <div className="flex items-center gap-4 w-full md:w-auto">
      <div className="w-12 h-12 rounded-xl bg-slate-700/40 flex-shrink-0"></div>
      <div className="space-y-2 w-full md:w-48">
        <div className="h-4 bg-slate-700/50 rounded w-3/4"></div>
        <div className="h-3 bg-slate-700/30 rounded w-1/2"></div>
      </div>
    </div>
    <div className="h-4 bg-slate-700/40 rounded w-24 md:w-32"></div>
    <div className="h-10 bg-slate-700/50 rounded w-28 flex-shrink-0"></div>
  </Pulse>
);

// Form / Profile Skeleton
export const ProfileSkeleton = () => (
  <div className="space-y-6">
    <div className="flex items-center gap-6 pb-6 border-b border-white/5">
      <Pulse className="w-20 h-20 rounded-2xl"></Pulse>
      <div className="space-y-2">
        <Pulse className="h-5 w-32"></Pulse>
        <Pulse className="h-3.5 w-48"></Pulse>
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Pulse className="h-3 w-20"></Pulse>
          <Pulse className="h-11 w-full"></Pulse>
        </div>
      ))}
    </div>
  </div>
);

// Detail Page Skeleton (for Doctor Details)
export const DetailSkeleton = () => (
  <div className="space-y-6">
    <Pulse className="h-48 w-full border border-white/5 p-6 flex flex-col justify-end">
      <div className="space-y-2">
        <Pulse className="h-6 w-1/4 bg-slate-700/50"></Pulse>
        <Pulse className="h-4 w-1/3 bg-slate-700/30"></Pulse>
      </div>
    </Pulse>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        <Pulse className="h-32 w-full border border-white/5"></Pulse>
        <Pulse className="h-48 w-full border border-white/5"></Pulse>
      </div>
      <Pulse className="h-64 w-full border border-white/5"></Pulse>
    </div>
  </div>
);
