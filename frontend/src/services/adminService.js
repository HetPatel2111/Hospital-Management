import api from "./api.js";

/**
 * Fetch overview KPIs for the admin dashboard
 */
export const getOverviewKPIs = async () => {
  const response = await api.get("/admin/dashboard/overview");
  return response.data;
};

/**
 * Fetch appointment counts analytics (daily, weekly, monthly)
 */
export const getAppointmentAnalytics = async () => {
  const response = await api.get("/admin/dashboard/appointments");
  return response.data;
};

/**
 * Fetch revenue analytics (daily, weekly, monthly)
 */
export const getRevenueAnalytics = async () => {
  const response = await api.get("/admin/dashboard/revenue");
  return response.data;
};

/**
 * Fetch refund status counts and refunded amount
 */
export const getRefundAnalytics = async () => {
  const response = await api.get("/admin/dashboard/refunds");
  return response.data;
};

/**
 * Fetch doctor popularity and status metrics
 */
export const getDoctorAnalytics = async () => {
  const response = await api.get("/admin/dashboard/doctors");
  return response.data;
};

/**
 * Search and list patients with pagination
 * @param {object} params - query parameters (page, limit, search)
 */
export const listPatients = async (params = {}) => {
  const response = await api.get("/admin/patients", { params });
  return response.data;
};

/**
 * Suspend a patient account
 * @param {string} patientId 
 */
export const suspendPatient = async (patientId) => {
  const response = await api.patch(`/admin/patients/${patientId}/suspend`);
  return response.data;
};

/**
 * Reactivate a suspended patient account
 * @param {string} patientId 
 */
export const reactivatePatient = async (patientId) => {
  const response = await api.patch(`/admin/patients/${patientId}/activate`);
  return response.data;
};

/**
 * List all doctors for admin review (with status, search, page filters)
 * @param {object} params - query parameters (page, limit, search, status)
 */
export const listDoctorsAdmin = async (params = {}) => {
  const response = await api.get("/admin/doctors", { params });
  return response.data;
};

/**
 * Approve a pending doctor registration
 * @param {string} doctorId 
 */
export const approveDoctor = async (doctorId) => {
  const response = await api.patch(`/admin/doctors/${doctorId}/approve`);
  return response.data;
};

/**
 * Reject/Decline a pending doctor registration
 * @param {string} doctorId 
 */
export const rejectDoctor = async (doctorId) => {
  const response = await api.patch(`/admin/doctors/${doctorId}/reject`);
  return response.data;
};

/**
 * Suspend an approved doctor account
 * @param {string} doctorId 
 */
export const suspendDoctor = async (doctorId) => {
  const response = await api.patch(`/admin/doctors/${doctorId}/deactivate`);
  return response.data;
};

/**
 * Reactivate a suspended doctor account
 * @param {string} doctorId 
 */
export const reactivateDoctor = async (doctorId) => {
  const response = await api.patch(`/admin/doctors/${doctorId}/activate`);
  return response.data;
};

/**
 * List all appointments across the system
 * @param {object} params - query parameters (page, limit, search, status)
 */
export const listAllAppointments = async (params = {}) => {
  const response = await api.get("/admin/appointments", { params });
  return response.data;
};

/**
 * Update any appointment's status
 * @param {string} appointmentId 
 * @param {string} status 
 */
export const updateAppointmentStatus = async (appointmentId, status) => {
  const response = await api.patch(`/admin/appointments/${appointmentId}/status`, { status });
  return response.data;
};

/**
 * Get all payment records and revenue ledger entries
 * @param {object} params - query parameters (page, limit, status)
 */
export const getAllPayments = async (params = {}) => {
  const response = await api.get("/admin/payments", { params });
  return response.data;
};

/**
 * Register a new doctor from the admin control panel
 * @param {object} payload - doctor profile details
 */
export const createDoctorAdmin = async (payload) => {
  const response = await api.post("/admin/doctors", payload);
  return response.data;
};
