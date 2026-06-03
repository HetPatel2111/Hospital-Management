import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyDoctorProfile, updateMyDoctorProfile } from "../../services/doctorService.js";
import { THEME } from "../../theme/index.js";
import { ProfileSkeleton } from "../../components/Skeletons.jsx";

export default function DoctorProfile() {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [experienceYears, setExperienceYears] = useState(0);
  const [qualificationText, setQualificationText] = useState("");
  const [consultationFee, setConsultationFee] = useState(0);
  const [bio, setBio] = useState("");

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch current profile data
  const { data, isLoading, error } = useQuery({
    queryKey: ["doctorProfile"],
    queryFn: getMyDoctorProfile
  });

  // Load state when data is resolved
  useEffect(() => {
    if (data?.data) {
      const doc = data.data.doctor || {};
      setFullName(doc.fullName || doc.userId?.name || "");
      setPhone(doc.userId?.phone || "");
      setSpecialization(doc.specialization || "");
      setExperienceYears(doc.experienceYears || 0);
      setQualificationText(Array.isArray(doc.qualification) ? doc.qualification.join(", ") : "");
      setConsultationFee(doc.consultationFee || 0);
      setBio(doc.bio || "");
    }
  }, [data]);

  // Mutation to save changes
  const updateMutation = useMutation({
    mutationFn: (payload) => updateMyDoctorProfile(payload),
    onSuccess: () => {
      queryClient.invalidateQueries(["doctorProfile"]);
      setSuccessMessage("Your profile information has been successfully updated!");
      setTimeout(() => setSuccessMessage(""), 4000);
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || "Failed to update profile settings.");
      setTimeout(() => setErrorMessage(""), 4500);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Parse qualification comma-separated text into array
    const qualification = qualificationText
      .split(",")
      .map((q) => q.trim())
      .filter((q) => q.length > 0);

    if (qualification.length === 0) {
      setErrorMessage("Please supply at least one qualification credentials (e.g. MBBS).");
      return;
    }

    setErrorMessage("");
    updateMutation.mutate({
      fullName,
      phone,
      specialization,
      experienceYears: Number(experienceYears),
      qualification,
      consultationFee: Number(consultationFee),
      bio
    });
  };

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-left">
        Failed to fetch doctor profile dossier record.
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left max-w-2xl">
      {/* Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-50 tracking-tight">Profile Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Configure your biography statement, academic qualification degrees, clinical specialization, and consultation fees.</p>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium animate-pulse">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <ProfileSkeleton />
      ) : (
        <form onSubmit={handleSubmit} className={`${THEME.glass.card} p-6 border border-white/5 space-y-5 text-xs text-slate-300`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Full Name */}
            <div>
              <label className="block font-bold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={`w-full px-4 py-3 text-xs ${THEME.glass.input}`}
                required
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block font-bold text-slate-400 uppercase tracking-wider mb-2">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={`w-full px-4 py-3 text-xs ${THEME.glass.input}`}
                required
              />
            </div>

            {/* Specialization */}
            <div>
              <label className="block font-bold text-slate-400 uppercase tracking-wider mb-2">Specialization</label>
              <input
                type="text"
                value={specialization}
                onChange={(e) => setSpecialization(e.target.value)}
                className={`w-full px-4 py-3 text-xs ${THEME.glass.input}`}
                required
              />
            </div>

            {/* Experience Years */}
            <div>
              <label className="block font-bold text-slate-400 uppercase tracking-wider mb-2">Years of Experience</label>
              <input
                type="number"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                min="0"
                max="80"
                className={`w-full px-4 py-3 text-xs ${THEME.glass.input}`}
                required
              />
            </div>

            {/* Qualifications */}
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-400 uppercase tracking-wider mb-2">Academic Qualifications (comma separated)</label>
              <input
                type="text"
                value={qualificationText}
                onChange={(e) => setQualificationText(e.target.value)}
                placeholder="e.g. MBBS, MD, FRCP Cardiology"
                className={`w-full px-4 py-3 text-xs ${THEME.glass.input}`}
                required
              />
            </div>

            {/* Consultation Fee */}
            <div>
              <label className="block font-bold text-slate-400 uppercase tracking-wider mb-2">Consultation Fee (₹)</label>
              <input
                type="number"
                value={consultationFee}
                onChange={(e) => setConsultationFee(e.target.value)}
                min="0"
                className={`w-full px-4 py-3 text-xs ${THEME.glass.input}`}
                required
              />
            </div>
          </div>

          {/* Biography statement */}
          <div>
            <label className="block font-bold text-slate-400 uppercase tracking-wider mb-2">Biography / Profile Summary</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className={`w-full px-4 py-3 text-xs ${THEME.glass.input} resize-none`}
              rows="5"
              maxLength="1000"
              placeholder="Provide a professional description about your clinical practice..."
            />
          </div>

          {/* Submit */}
          <div className="pt-4 border-t border-white/5 flex justify-end">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className={THEME.glass.buttonPrimary}
            >
              {updateMutation.isPending ? "Saving..." : "Save Profile Details"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
