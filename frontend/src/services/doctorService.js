import api from "./api.js";

/**
 * Fetch all approved doctors (for patient booking)
 */
export const getDoctors = async (params = {}) => {
  const response = await api.get("/doctors", { params });
  return response.data;
};

/**
 * Get doctor by ID
 */
export const getDoctorById = async (id) => {
  const response = await api.get(`/doctors/${id}`);
  return response.data;
};

/**
 * Fetch doctor availability lookup list for booking
 */
export const getDoctorAvailability = async (id, date) => {
  const response = await api.get(`/doctors/${id}/availability-lookup`, {
    params: { date },
  });
  return response.data;
};

/**
 * Fetch active doctor's own profile settings
 */
export const getMyDoctorProfile = async () => {
  const response = await api.get("/doctors/me");
  return response.data;
};

/**
 * Update active doctor's own profile (consultation fee, bio, specialization, qualification, experienceYears)
 */
export const updateMyDoctorProfile = async (payload) => {
  const response = await api.patch("/doctors/me", payload);
  return response.data;
};

/**
 * Fetch active doctor's own shift hours schedule
 */
export const getMyAvailability = async () => {
  const response = await api.get("/doctors/me/availability");
  return response.data;
};

/**
 * Update active doctor's weekly schedules and holiday exceptions
 */
export const updateMyAvailability = async (payload) => {
  const response = await api.put("/doctors/me/availability", payload);
  return response.data;
};

/**
 * List doctor's own appointments queue
 */
export const getMyAppointments = async (params = {}) => {
  const response = await api.get("/doctors/me/appointments", { params });
  return response.data;
};

/**
 * Confirm a doctor appointment
 */
export const confirmAppointment = async (appointmentId) => {
  const response = await api.patch(`/appointments/${appointmentId}/confirm`);
  return response.data;
};

/**
 * Complete a doctor appointment
 */
export const completeAppointment = async (appointmentId) => {
  const response = await api.patch(`/appointments/${appointmentId}/complete`);
  return response.data;
};

/**
 * Cancel an appointment
 */
export const cancelAppointment = async (appointmentId, cancelReason) => {
  const response = await api.patch(`/appointments/${appointmentId}/cancel`, { cancelReason });
  return response.data;
};

/**
 * Get details of a patient assigned to the active doctor
 */
export const getMyPatientById = async (patientId) => {
  const response = await api.get(`/doctors/me/patients/${patientId}`);
  return response.data;
};

/**
 * Write a medical prescription for a patient consultation
 * @param {object} payload - { appointmentId, patientId, diagnosis, medicines, notes }
 */
export const createPrescription = async (payload) => {
  const response = await api.post("/doctors/me/prescriptions", payload);
  return response.data;
};
