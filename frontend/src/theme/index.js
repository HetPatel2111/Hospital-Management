export const THEME = {
  colors: {
    primary: "#0ea5e9", // Sky 500
    primaryHover: "#0284c7", // Sky 600
    primaryLight: "#e0f2fe", // Sky 100
    primaryDark: "#0c4a6e", // Sky 900
    
    background: "#020617", // slate 950
    cardBg: "rgba(30, 41, 59, 0.4)", // Glassmorphism card bg
    border: "rgba(255, 255, 255, 0.08)", // subtle white borders
    textPrimary: "#f8fafc", // slate 50
    textSecondary: "#94a3b8", // slate 400
    textMuted: "#64748b", // slate 500
    
    success: "#10b981", // Emerald 500
    warning: "#f59e0b", // Amber 500
    error: "#ef4444", // Red 500
    info: "#3b82f6", // Blue 500
  },
  
  glass: {
    card: "backdrop-blur-md bg-slate-900/40 border border-white/5 shadow-2xl rounded-2xl",
    input: "bg-slate-950/50 border border-white/10 text-slate-100 rounded-xl focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/50 transition-all outline-none",
    buttonPrimary: "bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-medium px-5 py-3 rounded-xl shadow-lg shadow-sky-500/25 active:scale-95 transition-all text-center",
    buttonSecondary: "bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-medium px-5 py-3 rounded-xl active:scale-95 transition-all text-center"
  },

  animations: {
    fadeIn: "transition-all duration-300 ease-out",
    slideUp: "transition-all duration-500 ease-out",
  }
};
