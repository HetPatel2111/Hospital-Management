import React from "react";

export default function EmptyState({ title, description, iconType, actionLabel, onActionClick }) {
  // Select helper icons based on type
  const renderIcon = () => {
    switch (iconType) {
      case "appointments":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
          </svg>
        );
      case "notifications":
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
        );
      case "doctors":
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.5-1.619Z" />
          </svg>
        );
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-white/5 bg-slate-900/20 backdrop-blur-md max-w-lg mx-auto">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white/5 border border-white/10 text-slate-400 mb-6 shadow-xl">
        {renderIcon()}
      </div>
      <h3 className="text-lg font-bold text-slate-200 mb-2">{title || "No data available"}</h3>
      <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-xs">{description || "There is currently no information to show in this list."}</p>
      
      {actionLabel && onActionClick && (
        <button
          onClick={onActionClick}
          className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wider transition-all duration-200 active:scale-95 shadow-md shadow-sky-500/5"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
