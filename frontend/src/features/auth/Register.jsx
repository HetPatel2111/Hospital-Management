import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { ROUTES } from "../../constants/routes.js";
import { THEME } from "../../theme/index.js";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "patient",
    // Doctor specific fields
    specialization: "",
    qualification: "",
    experienceYears: "",
    registrationNumber: "",
    consultationFee: "",
    bio: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate fields
    if (!formData.name || !formData.email || !formData.password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || undefined,
      password: formData.password,
      role: formData.role,
    };

    if (formData.role === "doctor") {
      if (
        !formData.specialization ||
        !formData.qualification ||
        !formData.experienceYears ||
        !formData.registrationNumber ||
        !formData.consultationFee
      ) {
        setError("Please fill in all doctor-specific fields.");
        return;
      }

      payload.specialization = formData.specialization.trim();
      payload.qualification = formData.qualification
        .split(",")
        .map((q) => q.trim())
        .filter(Boolean);
      payload.experienceYears = parseInt(formData.experienceYears, 10);
      payload.registrationNumber = formData.registrationNumber.trim();
      payload.consultationFee = parseFloat(formData.consultationFee);
      if (formData.bio.trim()) {
        payload.bio = formData.bio.trim();
      }
    }

    setIsSubmitting(true);
    try {
      await register(payload);
      setSuccess("Account registered successfully! Redirecting to login...");
      setTimeout(() => {
        navigate(ROUTES.LOGIN);
      }, 2000);
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "Registration failed. Please check your details and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-12 relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none"></div>

      <div className={`w-full max-w-2xl p-8 my-8 ${THEME.glass.card} ${THEME.animations.slideUp} z-10`}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 mb-4 shadow-lg shadow-sky-500/5">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-9 1.5h.008v.008H7.5V12c0-3.37 2.73-6 6-6h1.5m-9 9h.008v.008H7.5v-.008Zm0 3h.008v.008H7.5v-.008Zm3 0h.008v.008h-.008v-.008Zm0-3h.008v.008h-.008v-.008Zm3 0h.008v.008h-.008v-.008Zm0 3h.008v.008h-.008v-.008Z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-50">Create Account</h1>
          <p className="mt-2 text-sm text-slate-400">
            Sign up to get started with AI Hospital Management System
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
              <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
            </svg>
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Role selector tab style */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
              Registration Role
            </label>
            <div className="grid grid-cols-2 gap-4 p-1 bg-slate-950/60 rounded-xl border border-white/5">
              <button
                type="button"
                className={`py-3 rounded-lg text-sm font-medium transition-all ${
                  formData.role === "patient"
                    ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                onClick={() => setFormData((prev) => ({ ...prev, role: "patient" }))}
              >
                Patient Account
              </button>
              <button
                type="button"
                className={`py-3 rounded-lg text-sm font-medium transition-all ${
                  formData.role === "doctor"
                    ? "bg-sky-500 text-white shadow-md shadow-sky-500/20"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                onClick={() => setFormData((prev) => ({ ...prev, role: "doctor" }))}
              >
                Doctor Profile
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Full Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-4 py-3 text-sm ${THEME.glass.input}`}
                placeholder="Dr. John Doe / Jane Doe"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-3 text-sm ${THEME.glass.input}`}
                placeholder="email@example.com"
                required
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Phone Number
              </label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={`w-full px-4 py-3 text-sm ${THEME.glass.input}`}
                placeholder="+1 (555) 000-0000"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Password *
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-4 py-3 text-sm ${THEME.glass.input}`}
                placeholder="••••••••"
                required
                disabled={isSubmitting}
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Must include 8+ chars, 1 uppercase, 1 lowercase, 1 number.
              </span>
            </div>
          </div>

          {/* Conditional Doctor Fields */}
          {formData.role === "doctor" && (
            <div className={`border-t border-white/5 pt-6 space-y-5 ${THEME.animations.fadeIn}`}>
              <h3 className="text-md font-semibold text-sky-400 tracking-wide">
                Professional Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Specialization *
                  </label>
                  <input
                    type="text"
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 text-sm ${THEME.glass.input}`}
                    placeholder="e.g. Cardiology, Pediatrics"
                    required={formData.role === "doctor"}
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Qualifications *
                  </label>
                  <input
                    type="text"
                    name="qualification"
                    value={formData.qualification}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 text-sm ${THEME.glass.input}`}
                    placeholder="e.g. MBBS, MD (comma separated)"
                    required={formData.role === "doctor"}
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Years of Experience *
                  </label>
                  <input
                    type="number"
                    name="experienceYears"
                    value={formData.experienceYears}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 text-sm ${THEME.glass.input}`}
                    placeholder="e.g. 10"
                    min="0"
                    required={formData.role === "doctor"}
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Medical Registration Number *
                  </label>
                  <input
                    type="text"
                    name="registrationNumber"
                    value={formData.registrationNumber}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 text-sm ${THEME.glass.input}`}
                    placeholder="e.g. REG-12345"
                    required={formData.role === "doctor"}
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Consultation Fee ($) *
                  </label>
                  <input
                    type="number"
                    name="consultationFee"
                    value={formData.consultationFee}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 text-sm ${THEME.glass.input}`}
                    placeholder="e.g. 150"
                    min="0"
                    required={formData.role === "doctor"}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Professional Bio
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows="3"
                  className={`w-full px-4 py-3 text-sm ${THEME.glass.input} resize-none`}
                  placeholder="Describe your medical expertise and practice..."
                  disabled={isSubmitting}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className={`w-full py-3 flex items-center justify-center gap-2 mt-4 ${THEME.glass.buttonPrimary}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Account...
              </>
            ) : (
              "Sign Up"
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-white/5 pt-6">
          <p className="text-sm text-slate-400">
            Already have an account?{" "}
            <Link
              to={ROUTES.LOGIN}
              className="text-sky-400 hover:text-sky-300 font-semibold transition-colors"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
