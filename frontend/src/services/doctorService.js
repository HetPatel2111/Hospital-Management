import api from "./api.js";

export const getDoctors = async (params = {}) => {
  const response = await api.get("/doctors", { params });
  return response.data;
};

export const getDoctorById = async (id) => {
  const response = await api.get(`/doctors/${id}`);
  return response.data;
};

export const getDoctorAvailability = async (id, date) => {
  const response = await api.get(`/doctors/${id}/availability-lookup`, {
    params: { date },
  });
  return response.data;
};
