import api from "./api.js";

export const createAppointment = async (payload) => {
  const response = await api.post("/appointments", payload);
  return response.data;
};

export const getAppointmentById = async (id) => {
  const response = await api.get(`/appointments/${id}`);
  return response.data;
};

export const cancelAppointment = async (id, reason = "") => {
  const response = await api.patch(`/appointments/${id}/cancel`, { reason });
  return response.data;
};

export const rescheduleAppointment = async (id, payload) => {
  const response = await api.patch(`/appointments/${id}/reschedule`, payload);
  return response.data;
};
