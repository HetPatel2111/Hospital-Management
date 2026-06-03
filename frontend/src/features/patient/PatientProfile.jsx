import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyProfile, updateMyProfile } from "../../services/patientService.js";
import { ProfileSkeleton } from "../../components/Skeletons.jsx";
import { THEME } from "../../theme/index.js";

export default function PatientProfile() {
  const queryClient = useQueryClient();
  
  // 1. Fetch current profile data
  const { data: profileData, isLoading } = useQuery({
    queryKey: ["patientProfile"],
    queryFn: getMyProfile,
  });

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    dateOfBirth: "",
    gender: "undisclosed",
    bloodGroup: "unknown",
    address: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      country: "",
      postalCode: "",
    },
    emergencyContact: {
      name: "",
      phone: "",
      relationship: "",
    },
    medicalHistory: [],
    allergies: [],
    currentMedications: [],
  });

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [newAllergy, setNewAllergy] = useState("");
  const [newMed, setNewMed] = useState("");
  const [newHistory, setNewHistory] = useState("");

  // Sync state with fetched database data
  useEffect(() => {
    if (profileData?.data?.patient) {
      const p = profileData.data.patient;
      setFormData({
        name: p.name || "",
        phone: p.phone || "",
        dateOfBirth: p.dateOfBirth ? p.dateOfBirth.split("T")[0] : "",
        gender: p.gender || "undisclosed",
        bloodGroup: p.bloodGroup || "unknown",
        address: {
          line1: p.address?.line1 || "",
          line2: p.address?.line2 || "",
          city: p.address?.city || "",
          state: p.address?.state || "",
          country: p.address?.country || "",
          postalCode: p.address?.postalCode || "",
        },
        emergencyContact: {
          name: p.emergencyContact?.name || "",
          phone: p.emergencyContact?.phone || "",
          relationship: p.emergencyContact?.relationship || "",
        },
        medicalHistory: p.medicalHistory || [],
        allergies: p.allergies || [],
        currentMedications: p.currentMedications || [],
      });
    }
  }, [profileData]);

  // 2. Profile update mutation
  const updateMutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(["patientProfile"], data);
      queryClient.invalidateQueries(["patientDashboard"]);
      setSuccessMsg("Your medical profile has been saved successfully.");
      setTimeout(() => setSuccessMsg(""), 4000);
    },
    onError: (err) => {
      console.error(err);
      setErrorMsg(err.response?.data?.message || "Failed to update profile details.");
      setTimeout(() => setErrorMsg(""), 4000);
    },
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNestedChange = (section, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    const payload = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      dateOfBirth: formData.dateOfBirth || undefined,
      gender: formData.gender,
      bloodGroup: formData.bloodGroup,
      address: formData.address,
      emergencyContact: formData.emergencyContact,
      medicalHistory: formData.medicalHistory,
      allergies: formData.allergies,
      currentMedications: formData.currentMedications,
    };

    updateMutation.mutate(payload);
  };

  // Helper arrays update functions
  const addTag = (field, value, setter) => {
    if (value.trim() && !formData[field].includes(value.trim())) {
      setFormData((prev) => ({
        ...prev,
        [field]: [...prev[field], value.trim()],
      }));
      setter("");
    }
  };

  const removeTag = (field, index) => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index),
    }));
  };

  if (isLoading) {
    return (
      <div className={`p-6 ${THEME.glass.card}`}>
        <ProfileSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-50 tracking-tight">Profile Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Configure your personal contacts, address settings, and medical histories</p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
          </svg>
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
            <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: General Info */}
        <div className={`p-6 ${THEME.glass.card}`}>
          <h3 className="text-md font-bold text-sky-400 mb-5 tracking-wide">General Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Full Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-4 py-2.5 text-sm ${THEME.glass.input}`}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Phone Number</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className={`w-full px-4 py-2.5 text-sm ${THEME.glass.input}`}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Date of Birth</label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleInputChange}
                className={`w-full px-4 py-2.5 text-sm ${THEME.glass.input}`}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2.5 text-sm ${THEME.glass.input} h-[42px] appearance-none`}
                >
                  <option value="undisclosed">Undisclosed</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Blood Group</label>
                <select
                  name="bloodGroup"
                  value={formData.bloodGroup}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-2.5 text-sm ${THEME.glass.input} h-[42px] appearance-none`}
                >
                  <option value="unknown">Unknown</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Address & Emergency Contact */}
        <div className={`p-6 ${THEME.glass.card}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Address */}
            <div className="space-y-4 text-left">
              <h3 className="text-md font-bold text-sky-400 mb-1 tracking-wide">Residential Address</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Address Line 1"
                  value={formData.address.line1}
                  onChange={(e) => handleNestedChange("address", "line1", e.target.value)}
                  className={`w-full px-4 py-2.5 text-sm ${THEME.glass.input}`}
                />
                <input
                  type="text"
                  placeholder="Address Line 2"
                  value={formData.address.line2}
                  onChange={(e) => handleNestedChange("address", "line2", e.target.value)}
                  className={`w-full px-4 py-2.5 text-sm ${THEME.glass.input}`}
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="City"
                    value={formData.address.city}
                    onChange={(e) => handleNestedChange("address", "city", e.target.value)}
                    className={`w-full px-4 py-2.5 text-sm ${THEME.glass.input}`}
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={formData.address.state}
                    onChange={(e) => handleNestedChange("address", "state", e.target.value)}
                    className={`w-full px-4 py-2.5 text-sm ${THEME.glass.input}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Postal Code"
                    value={formData.address.postalCode}
                    onChange={(e) => handleNestedChange("address", "postalCode", e.target.value)}
                    className={`w-full px-4 py-2.5 text-sm ${THEME.glass.input}`}
                  />
                  <input
                    type="text"
                    placeholder="Country"
                    value={formData.address.country}
                    onChange={(e) => handleNestedChange("address", "country", e.target.value)}
                    className={`w-full px-4 py-2.5 text-sm ${THEME.glass.input}`}
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="space-y-4 text-left">
              <h3 className="text-md font-bold text-sky-400 mb-1 tracking-wide">Emergency Contact</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Contact Name"
                  value={formData.emergencyContact.name}
                  onChange={(e) => handleNestedChange("emergencyContact", "name", e.target.value)}
                  className={`w-full px-4 py-2.5 text-sm ${THEME.glass.input}`}
                />
                <input
                  type="text"
                  placeholder="Contact Phone"
                  value={formData.emergencyContact.phone}
                  onChange={(e) => handleNestedChange("emergencyContact", "phone", e.target.value)}
                  className={`w-full px-4 py-2.5 text-sm ${THEME.glass.input}`}
                />
                <input
                  type="text"
                  placeholder="Relationship (e.g. Spouse, Parent)"
                  value={formData.emergencyContact.relationship}
                  onChange={(e) => handleNestedChange("emergencyContact", "relationship", e.target.value)}
                  className={`w-full px-4 py-2.5 text-sm ${THEME.glass.input}`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Medical Histology Tags */}
        <div className={`p-6 ${THEME.glass.card} text-left`}>
          <h3 className="text-md font-bold text-sky-400 mb-5 tracking-wide">Medical Conditions & History</h3>
          
          <div className="space-y-5">
            {/* Allergies */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Known Allergies</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Add allergy (e.g. Penicillin, Peanuts)"
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  className={`flex-1 px-4 py-2 text-xs ${THEME.glass.input}`}
                />
                <button
                  type="button"
                  onClick={() => addTag("allergies", newAllergy, setNewAllergy)}
                  className={`px-4 py-2 text-xs ${THEME.glass.buttonSecondary}`}
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.allergies.length === 0 ? (
                  <span className="text-xs text-slate-500 italic">No listed allergies.</span>
                ) : (
                  formData.allergies.map((tag, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 font-medium">
                      {tag}
                      <button type="button" onClick={() => removeTag("allergies", idx)} className="hover:text-red-200 text-[10px]">✕</button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Current Medications */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Current Medications</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Add medication (e.g. Lisinopril, Metformin)"
                  value={newMed}
                  onChange={(e) => setNewMed(e.target.value)}
                  className={`flex-1 px-4 py-2 text-xs ${THEME.glass.input}`}
                />
                <button
                  type="button"
                  onClick={() => addTag("currentMedications", newMed, setNewMed)}
                  className={`px-4 py-2 text-xs ${THEME.glass.buttonSecondary}`}
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.currentMedications.length === 0 ? (
                  <span className="text-xs text-slate-500 italic">No active medications listed.</span>
                ) : (
                  formData.currentMedications.map((tag, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
                      {tag}
                      <button type="button" onClick={() => removeTag("currentMedications", idx)} className="hover:text-sky-200 text-[10px]">✕</button>
                    </span>
                  ))
                )}
              </div>
            </div>

            {/* Medical History */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Medical History & Diseases</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Add past history condition (e.g. Asthma, Hypertension)"
                  value={newHistory}
                  onChange={(e) => setNewHistory(e.target.value)}
                  className={`flex-1 px-4 py-2 text-xs ${THEME.glass.input}`}
                />
                <button
                  type="button"
                  onClick={() => addTag("medicalHistory", newHistory, setNewHistory)}
                  className={`px-4 py-2 text-xs ${THEME.glass.buttonSecondary}`}
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.medicalHistory.length === 0 ? (
                  <span className="text-xs text-slate-500 italic">No listed medical history.</span>
                ) : (
                  formData.medicalHistory.map((tag, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-white/5 text-slate-300 border border-white/10 font-medium">
                      {tag}
                      <button type="button" onClick={() => removeTag("medicalHistory", idx)} className="hover:text-slate-100 text-[10px]">✕</button>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className={`px-8 py-3.5 ${THEME.glass.buttonPrimary}`}
          >
            {updateMutation.isPending ? "Saving Profile..." : "Save Medical Profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
