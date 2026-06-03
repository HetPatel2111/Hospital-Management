import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyAvailability, updateMyAvailability } from "../../services/doctorService.js";
import { THEME } from "../../theme/index.js";
import { ProfileSkeleton } from "../../components/Skeletons.jsx";

const DAYS_OF_WEEK = [
  { value: 1, name: "Monday" },
  { value: 2, name: "Tuesday" },
  { value: 3, name: "Wednesday" },
  { value: 4, name: "Thursday" },
  { value: 5, name: "Friday" },
  { value: 6, name: "Saturday" },
  { value: 0, name: "Sunday" }
];

export default function DoctorAvailability() {
  const queryClient = useQueryClient();
  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [exceptions, setExceptions] = useState([]);
  
  // Exception input form state
  const [excDate, setExcDate] = useState("");
  const [excAvailable, setExcAvailable] = useState(false);
  const [excReason, setExcReason] = useState("");

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Fetch current availability settings
  const { data, isLoading, error } = useQuery({
    queryKey: ["doctorAvailability"],
    queryFn: getMyAvailability
  });

  // Initialize form state once data arrives
  useEffect(() => {
    if (data?.data) {
      const avail = data.data.availability || {};
      
      // Initialize weekly schedule with all 7 days if they aren't fully configured
      const existingWeekly = avail.weeklySchedule || [];
      const formattedWeekly = DAYS_OF_WEEK.map((day) => {
        const found = existingWeekly.find((w) => w.dayOfWeek === day.value);
        return found
          ? { ...found }
          : { dayOfWeek: day.value, isAvailable: false, slots: [] };
      });
      
      setWeeklySchedule(formattedWeekly);
      setExceptions(avail.exceptions || []);
    }
  }, [data]);

  // Mutation to update availability
  const updateMutation = useMutation({
    mutationFn: (payload) => updateMyAvailability({ availability: payload }),
    onSuccess: () => {
      queryClient.invalidateQueries(["doctorAvailability"]);
      setSuccessMessage("Your shift schedule has been successfully updated!");
      setTimeout(() => setSuccessMessage(""), 4000);
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || "Failed to update availability schedule.");
      setTimeout(() => setErrorMessage(""), 4500);
    }
  });

  const handleSave = () => {
    // Validate slots (must be chronologically ordered and not empty if available)
    for (const day of weeklySchedule) {
      if (day.isAvailable) {
        if (day.slots.length === 0) {
          setErrorMessage(`Please define at least one active slot time for ${DAYS_OF_WEEK.find(d => d.value === day.dayOfWeek).name}.`);
          return;
        }
        for (const slot of day.slots) {
          if (!slot.startTime || !slot.endTime) {
            setErrorMessage("All slot entries must have a start and end time.");
            return;
          }
          if (slot.endTime <= slot.startTime) {
            setErrorMessage("Slot end time must be chronologically after the start time.");
            return;
          }
        }
      }
    }

    setErrorMessage("");
    updateMutation.mutate({
      weeklySchedule,
      exceptions
    });
  };

  const handleDayToggle = (dayIndex) => {
    const updated = [...weeklySchedule];
    updated[dayIndex].isAvailable = !updated[dayIndex].isAvailable;
    if (updated[dayIndex].isAvailable && updated[dayIndex].slots.length === 0) {
      updated[dayIndex].slots = [{ startTime: "09:00", endTime: "13:00" }];
    }
    setWeeklySchedule(updated);
  };

  const handleAddSlot = (dayIndex) => {
    const updated = [...weeklySchedule];
    updated[dayIndex].slots.push({ startTime: "09:00", endTime: "17:00" });
    setWeeklySchedule(updated);
  };

  const handleRemoveSlot = (dayIndex, slotIndex) => {
    const updated = [...weeklySchedule];
    updated[dayIndex].slots = updated[dayIndex].slots.filter((_, i) => i !== slotIndex);
    if (updated[dayIndex].slots.length === 0) {
      updated[dayIndex].isAvailable = false;
    }
    setWeeklySchedule(updated);
  };

  const handleSlotTimeChange = (dayIndex, slotIndex, field, value) => {
    const updated = [...weeklySchedule];
    updated[dayIndex].slots[slotIndex][field] = value;
    setWeeklySchedule(updated);
  };

  // Add a holiday/exception date blocker
  const handleAddException = (e) => {
    e.preventDefault();
    if (!excDate) return;
    
    // Check if exception date already exists
    if (exceptions.some(e => new Date(e.date).toISOString().split("T")[0] === excDate)) {
      setErrorMessage("This exception date is already in the list.");
      return;
    }

    const newException = {
      date: new Date(excDate),
      isAvailable: excAvailable,
      reason: excReason.trim() || "Out of office"
    };

    setExceptions([...exceptions, newException]);
    setExcDate("");
    setExcAvailable(false);
    setExcReason("");
    setErrorMessage("");
  };

  const handleRemoveException = (index) => {
    setExceptions(exceptions.filter((_, i) => i !== index));
  };

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-left">
        Failed to fetch practitioner availability settings.
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left max-w-4xl">
      {/* Title */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-50 tracking-tight">Shift Settings</h1>
        <p className="text-sm text-slate-400 mt-1">Configure your weekly consulting days, patient appointment slot ranges, and manage vacation day overrides.</p>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Weekly configuration */}
          <div className="lg:col-span-2 space-y-4">
            <div className={`${THEME.glass.card} p-6 border border-white/5 space-y-6`}>
              <h3 className="text-sm font-bold text-slate-200">Weekly Consultation Shifts</h3>
              
              <div className="divide-y divide-white/5 space-y-4">
                {weeklySchedule.map((day, dIdx) => {
                  const dayName = DAYS_OF_WEEK.find((d) => d.value === day.dayOfWeek).name;
                  
                  return (
                    <div key={day.dayOfWeek} className="pt-4 first:pt-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      {/* Day toggle */}
                      <div className="flex items-center gap-3 w-40">
                        <input
                          type="checkbox"
                          checked={day.isAvailable}
                          onChange={() => handleDayToggle(dIdx)}
                          className="w-4 h-4 rounded border-white/10 text-sky-500 focus:ring-0 focus:ring-offset-0 bg-slate-950"
                        />
                        <span className={`text-xs font-bold ${day.isAvailable ? "text-slate-100" : "text-slate-500"}`}>
                          {dayName}
                        </span>
                      </div>

                      {/* Slots items */}
                      <div className="flex-1 w-full space-y-2">
                        {day.isAvailable ? (
                          day.slots.map((slot, sIdx) => (
                            <div key={sIdx} className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500 uppercase tracking-wider">From:</span>
                              <input
                                type="time"
                                value={slot.startTime}
                                onChange={(e) => handleSlotTimeChange(dIdx, sIdx, "startTime", e.target.value)}
                                className={`px-2 py-1 text-xs ${THEME.glass.input} border-white/10 font-mono`}
                              />
                              <span className="text-[10px] text-slate-500 uppercase tracking-wider">To:</span>
                              <input
                                type="time"
                                value={slot.endTime}
                                onChange={(e) => handleSlotTimeChange(dIdx, sIdx, "endTime", e.target.value)}
                                className={`px-2 py-1 text-xs ${THEME.glass.input} border-white/10 font-mono`}
                              />
                              
                              <button
                                type="button"
                                onClick={() => handleRemoveSlot(dIdx, sIdx)}
                                className="text-red-400 hover:text-red-300 text-xs font-bold px-2 py-1 bg-red-500/10 rounded border border-red-500/20"
                              >
                                Delete
                              </button>
                            </div>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500 italic">Not consulting on this day</span>
                        )}
                      </div>

                      {day.isAvailable && (
                        <button
                          type="button"
                          onClick={() => handleAddSlot(dIdx)}
                          className="text-[10px] font-bold text-sky-400 hover:underline shrink-0"
                        >
                          + Add slot
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-white/5 flex justify-end">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className={THEME.glass.buttonPrimary}
                >
                  {updateMutation.isPending ? "Saving..." : "Save Shift Schedule"}
                </button>
              </div>
            </div>
          </div>

          {/* Exceptions configuration overrides */}
          <div className="space-y-4">
            {/* Add override exception form */}
            <div className={`${THEME.glass.card} p-5 border border-white/5 space-y-4`}>
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Add Holiday Exception</h3>
              
              <form onSubmit={handleAddException} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Target Date</label>
                  <input
                    type="date"
                    value={excDate}
                    onChange={(e) => setExcDate(e.target.value)}
                    className={`w-full px-3 py-2 ${THEME.glass.input}`}
                    required
                  />
                </div>
                
                <div className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    checked={excAvailable}
                    onChange={() => setExcAvailable(!excAvailable)}
                    className="w-4 h-4 rounded border-white/10 text-sky-500 focus:ring-0 focus:ring-offset-0 bg-slate-950"
                  />
                  <span className="text-slate-400">Available to consult on this date?</span>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Reason / Description</label>
                  <input
                    type="text"
                    value={excReason}
                    onChange={(e) => setExcReason(e.target.value)}
                    placeholder="e.g. Annual Leave, Medical Conference..."
                    className={`w-full px-3 py-2 ${THEME.glass.input}`}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-slate-200 font-bold transition-all"
                >
                  Add Exception Override
                </button>
              </form>
            </div>

            {/* List overrides */}
            <div className={`${THEME.glass.card} p-5 border border-white/5 space-y-3`}>
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Holiday Override List</h3>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {exceptions.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">No vacation overrides scheduled</p>
                ) : (
                  exceptions.map((exc, index) => {
                    const dStr = new Date(exc.date).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    });
                    
                    return (
                      <div key={index} className="p-3 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-slate-200">{dStr}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{exc.reason}</p>
                          <span className={`inline-block text-[8px] font-bold mt-1.5 uppercase ${
                            exc.isAvailable ? "text-emerald-400" : "text-red-400"
                          }`}>
                            {exc.isAvailable ? "Available" : "Holiday / Blocked"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveException(index)}
                          className="text-red-400 hover:text-red-300 font-bold text-xs"
                        >
                          Remove
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
