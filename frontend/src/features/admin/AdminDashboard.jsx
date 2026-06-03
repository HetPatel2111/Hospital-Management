import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getOverviewKPIs,
  getRevenueAnalytics,
  getAppointmentAnalytics,
  getRefundAnalytics,
  getDoctorAnalytics
} from "../../services/adminService.js";
import { THEME } from "../../theme/index.js";
import { CardSkeleton } from "../../components/Skeletons.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from "recharts";

export default function AdminDashboard() {
  const [revenuePeriod, setRevenuePeriod] = useState("daily"); // "daily" | "weekly" | "monthly"
  const [apptPeriod, setApptPeriod] = useState("daily"); // "daily" | "weekly" | "monthly"

  // Fetch queries
  const { data: kpiData, isLoading: kpiLoading, error: kpiError } = useQuery({
    queryKey: ["adminKPIs"],
    queryFn: getOverviewKPIs
  });

  const { data: revData, isLoading: revLoading } = useQuery({
    queryKey: ["adminRevenueAnalytics"],
    queryFn: getRevenueAnalytics
  });

  const { data: apptData, isLoading: apptLoading } = useQuery({
    queryKey: ["adminApptAnalytics"],
    queryFn: getAppointmentAnalytics
  });

  const { data: refData, isLoading: refLoading } = useQuery({
    queryKey: ["adminRefundAnalytics"],
    queryFn: getRefundAnalytics
  });

  const { data: docData, isLoading: docLoading } = useQuery({
    queryKey: ["adminDocAnalytics"],
    queryFn: getDoctorAnalytics
  });

  const overview = kpiData?.data || {};

  // Formatter helpers
  const formatRevenueData = () => {
    const list = revData?.data?.[revenuePeriod] || [];
    return list.map((item) => {
      let label = "";
      if (revenuePeriod === "weekly" && item._id) {
        label = `Yr ${item._id.year} Wk ${item._id.week}`;
      } else {
        label = item._id || "N/A";
      }
      return {
        label,
        "Revenue (₹)": item.amount || 0
      };
    });
  };

  const formatApptData = () => {
    const list = apptData?.data?.[apptPeriod] || [];
    return list.map((item) => {
      let label = "";
      if (apptPeriod === "weekly" && item._id) {
        label = `Yr ${item._id.year} Wk ${item._id.week}`;
      } else {
        label = item._id || "N/A";
      }
      return {
        label,
        "Appointments": item.count || 0
      };
    });
  };

  const formatRefundData = () => {
    const r = refData?.data || {};
    return [
      { name: "Requested", count: r.requested || 0, color: "#f59e0b" },
      { name: "Approved", count: r.approved || 0, color: "#0ea5e9" },
      { name: "Rejected", count: r.rejected || 0, color: "#ef4444" },
      { name: "Refunded", count: r.refunded || 0, color: "#10b981" }
    ];
  };

  const isLoading = kpiLoading || revLoading || apptLoading || refLoading || docLoading;

  if (kpiError) {
    return (
      <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-left">
        Failed to fetch administrative metrics. Please check security authentication or server status.
      </div>
    );
  }

  // Combine doctor statistics for table (Most booked & Top revenue)
  const mostBooked = docData?.data?.mostBooked || [];
  const topRevenue = docData?.data?.topRevenue || [];
  
  // Merge rating / metrics by doctor ID
  const mergedDoctors = [];
  mostBooked.forEach((mb) => {
    const revMatch = topRevenue.find((tr) => tr.doctorId === mb.doctorId);
    mergedDoctors.push({
      id: mb.doctorId,
      fullName: mb.fullName,
      specialization: mb.specialization,
      rating: mb.rating,
      appointmentsCount: mb.appointmentsCount,
      revenue: revMatch ? revMatch.revenue : 0
    });
  });

  // Add any doctors in top revenue not in most booked
  topRevenue.forEach((tr) => {
    if (!mergedDoctors.some((d) => d.id === tr.doctorId)) {
      mergedDoctors.push({
        id: tr.doctorId,
        fullName: tr.fullName,
        specialization: tr.specialization,
        rating: tr.rating,
        appointmentsCount: 0,
        revenue: tr.revenue
      });
    }
  });

  // Sort by revenue descending
  mergedDoctors.sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="space-y-8 text-left">
      {/* Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-50 tracking-tight">Hospital Administration</h1>
        <p className="text-sm text-slate-400 mt-1">Real-time metrics, appointment volume tracking, billing analytics, and practitioner statistics.</p>
      </div>

      {/* KPI Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Card 1 */}
          <div className={`${THEME.glass.card} p-6 flex items-center justify-between hover:border-white/10 transition-all`}>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Patients</p>
              <h3 className="text-2xl font-extrabold text-slate-100 mt-2">{overview.totalPatients || 0}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.947 11.947 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584v-.109A11.944 11.944 0 0 1 12 18c2.676 0 5.216.584 7.5 1.62M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 2.25a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
            </div>
          </div>

          {/* Card 2 */}
          <div className={`${THEME.glass.card} p-6 flex items-center justify-between hover:border-white/10 transition-all`}>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Doctors</p>
              <h3 className="text-2xl font-extrabold text-slate-100 mt-2">
                {overview.totalDoctors || 0}
                <span className="text-xs font-normal text-emerald-400 ml-2">({overview.activeDoctors || 0} Active)</span>
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.746 3.746 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
              </svg>
            </div>
          </div>

          {/* Card 3 */}
          <div className={`${THEME.glass.card} p-6 flex items-center justify-between hover:border-white/10 transition-all`}>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Appointments</p>
              <h3 className="text-2xl font-extrabold text-slate-100 mt-2">
                {overview.totalAppointments || 0}
                <span className="text-xs font-normal text-sky-400 ml-2">({overview.todayAppointments || 0} Today)</span>
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
            </div>
          </div>

          {/* Card 4 */}
          <div className={`${THEME.glass.card} p-6 flex items-center justify-between hover:border-white/10 transition-all`}>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Revenue</p>
              <h3 className="text-2xl font-extrabold text-emerald-400 mt-2">₹{overview.totalRevenue || 0}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5m-18 0A2.25 2.25 0 0 1 4.5 2.25h15A2.25 2.25 0 0 1 21.75 4.5m-18 0v11.25A2.25 2.25 0 0 0 6 18h12a2.25 2.25 0 0 0 2.25-2.25V4.5m-10.5 7.5h.008v.008h-.008V12Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008Zm3-4.5h.008v.008h-.008V12Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008Zm3-4.5h.008v.008h-.008V12Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008v-.008Z" />
              </svg>
            </div>
          </div>

          {/* Card 5 */}
          <div className={`${THEME.glass.card} p-6 flex items-center justify-between hover:border-white/10 transition-all`}>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Refunded Amount</p>
              <h3 className="text-2xl font-extrabold text-slate-300 mt-2">₹{overview.totalRefunds || 0}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-500/10 border border-slate-500/20 text-slate-400 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
              </svg>
            </div>
          </div>

          {/* Card 6 */}
          <div className={`${THEME.glass.card} p-6 flex items-center justify-between hover:border-white/10 transition-all`}>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Refunds</p>
              <h3 className="text-2xl font-extrabold text-amber-500 mt-2">{overview.pendingRefundRequests || 0}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend AreaChart */}
        <div className={`${THEME.glass.card} p-6 border border-white/5`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-200">Revenue Volume Trend</h3>
              <p className="text-xs text-slate-400 mt-1">Financial cash-flow generated by successful payment checkouts</p>
            </div>
            {/* Toggles */}
            <div className="flex bg-slate-950/60 p-1 rounded-xl border border-white/5 self-start">
              {["daily", "weekly", "monthly"].map((p) => (
                <button
                  key={p}
                  onClick={() => setRevenuePeriod(p)}
                  className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all ${
                    revenuePeriod === p ? "bg-sky-500 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="h-72">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading chart data...</div>
            ) : formatRevenueData().length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No revenue data for this range.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formatRevenueData()}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="label" stroke="#475569" fontSize={9} dy={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={9} dx={-10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15, 23, 42, 0.9)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px"
                    }}
                    labelStyle={{ color: "#94a3b8", fontSize: "10px", fontWeight: "bold" }}
                    itemStyle={{ color: "#0ea5e9", fontSize: "11px" }}
                  />
                  <Area type="monotone" dataKey="Revenue (₹)" stroke="#0ea5e9" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Appointment Trend AreaChart */}
        <div className={`${THEME.glass.card} p-6 border border-white/5`}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-200">Appointments Volume Trend</h3>
              <p className="text-xs text-slate-400 mt-1">Number of appointments booked on the system</p>
            </div>
            <div className="flex bg-slate-950/60 p-1 rounded-xl border border-white/5 self-start">
              {["daily", "weekly", "monthly"].map((p) => (
                <button
                  key={p}
                  onClick={() => setApptPeriod(p)}
                  className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all ${
                    apptPeriod === p ? "bg-sky-500 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="h-72">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading chart data...</div>
            ) : formatApptData().length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No appointments recorded.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={formatApptData()}>
                  <defs>
                    <linearGradient id="colorAppt" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="label" stroke="#475569" fontSize={9} dy={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={9} dx={-10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15, 23, 42, 0.9)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px"
                    }}
                    labelStyle={{ color: "#94a3b8", fontSize: "10px", fontWeight: "bold" }}
                    itemStyle={{ color: "#818cf8", fontSize: "11px" }}
                  />
                  <Area type="monotone" dataKey="Appointments" stroke="#818cf8" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAppt)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Refund Status Distribution BarChart */}
        <div className={`${THEME.glass.card} p-6 border border-white/5 lg:col-span-1 flex flex-col`}>
          <div>
            <h3 className="text-base font-bold text-slate-200">Refund Claims Matrix</h3>
            <p className="text-xs text-slate-400 mt-1">Review status distribution of cancellation claims</p>
          </div>

          <div className="h-64 mt-6 flex-1">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading chart data...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={formatRefundData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="name" stroke="#475569" fontSize={9} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={9} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15, 23, 42, 0.9)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "12px"
                    }}
                    labelStyle={{ color: "#94a3b8", fontSize: "10px", fontWeight: "bold" }}
                    itemStyle={{ fontSize: "11px" }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={35}>
                    {formatRefundData().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Doctor Performance Table */}
        <div className={`${THEME.glass.card} p-6 border border-white/5 lg:col-span-2 overflow-hidden flex flex-col`}>
          <div>
            <h3 className="text-base font-bold text-slate-200">Doctor Performance Registry</h3>
            <p className="text-xs text-slate-400 mt-1">Top billing practitioners and booking volumes</p>
          </div>

          <div className="overflow-x-auto mt-6 flex-1">
            {isLoading ? (
              <div className="p-4 space-y-2">
                <div className="h-4 bg-white/5 rounded w-full animate-pulse"></div>
                <div className="h-4 bg-white/5 rounded w-5/6 animate-pulse"></div>
              </div>
            ) : mergedDoctors.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No doctor metrics logged.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[9px] uppercase font-bold tracking-wider text-slate-500">
                    <th className="pb-3 px-2">Doctor Name</th>
                    <th className="pb-3 px-2">Specialization</th>
                    <th className="pb-3 px-2 text-center">Total Appointments</th>
                    <th className="pb-3 px-2 text-right">Revenue Generated</th>
                    <th className="pb-3 px-2 text-right">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                  {mergedDoctors.map((doc) => (
                    <tr key={doc.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-2 font-bold text-slate-100">Dr. {doc.fullName}</td>
                      <td className="py-3.5 px-2 text-sky-400">{doc.specialization}</td>
                      <td className="py-3.5 px-2 text-center font-semibold">{doc.appointmentsCount}</td>
                      <td className="py-3.5 px-2 text-right text-emerald-400 font-extrabold">₹{doc.revenue}</td>
                      <td className="py-3.5 px-2 text-right">
                        <span className="inline-flex items-center gap-1 font-bold text-amber-400">
                          ★ <span className="text-slate-200">{doc.rating.toFixed(1)}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
