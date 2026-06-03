import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { THEME } from "../theme/index.js";

export default function DashboardLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-sky-500/30 selection:text-sky-200">
      {/* Top Navbar */}
      <Navbar />

      <div className="flex flex-1">
        {/* Left Navigation Sidebar */}
        <Sidebar />

        {/* Central main page viewport scrollable container */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          {/* Background ambient glowing details */}
          <div className="absolute top-10 right-10 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className={`relative max-w-7xl mx-auto ${THEME.animations.fadeIn}`}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
