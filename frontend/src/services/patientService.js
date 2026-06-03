import api from "./api.js";

export const getMyProfile = async () => {
  const response = await api.get("/patients/me");
  return response.data;
};

export const updateMyProfile = async (payload) => {
  const response = await api.patch("/patients/me", payload);
  return response.data;
};

export const getDashboard = async () => {
  const response = await api.get("/patients/me/dashboard");
  return response.data;
};

export const getNotifications = async (params = {}) => {
  const response = await api.get("/patients/me/notifications", { params });
  return response.data;
};

export const getAppointments = async (type = "history", params = {}) => {
  let path = "/patients/me/appointments";
  if (type === "upcoming") path += "/upcoming";
  if (type === "completed") path += "/completed";
  if (type === "cancelled") path += "/cancelled";

  const response = await api.get(path, { params });
  return response.data;
};
