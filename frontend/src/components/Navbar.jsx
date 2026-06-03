import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { THEME } from "../theme/index.js";

export default function Navbar() {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "admin":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "doctor":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      default:
        return "bg-sky-500/10 text-sky-400 border-sky-500/20";
    }
  };

  return (
    <nav className="h-16 border-b border-white/5 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
      {/* Brand logo details */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clipRule="evenodd" />
          </svg>
        </div>
        <span className="font-bold text-slate-100 tracking-wider text-sm md:text-md uppercase">
          Aegis <span className="text-sky-400 font-medium">Health</span>
        </span>
      </div>

      {/* User profile section */}
      <div className="relative">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-3 py-1.5 px-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all outline-none"
        >
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-sm">
            {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
          </div>
          <div className="text-left hidden md:block">
            <p className="text-xs font-semibold text-slate-200">{user?.name || "User"}</p>
            <p className="text-[10px] text-slate-500 lowercase">{user?.email || ""}</p>
          </div>
          <span className={`text-[10px] uppercase font-bold border px-2 py-0.5 rounded-full ${getRoleBadgeColor(user?.role)}`}>
            {user?.role || "Guest"}
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`w-4 h-4 text-slate-400 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
          >
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)}></div>
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/5 bg-slate-900 shadow-2xl p-2 z-20">
              <div className="px-3 py-2 border-b border-white/5 mb-1.5 md:hidden">
                <p className="text-xs font-semibold text-slate-200">{user?.name || "User"}</p>
                <p className="text-[10px] text-slate-500 lowercase">{user?.email || ""}</p>
              </div>
              
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                </svg>
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
