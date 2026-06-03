import api from "./api.js";

export const login = async ({ email, password }) => {
  const response = await api.post("/auth/login", { email, password });
  return response.data;
};

export const register = async (payload) => {
  const response = await api.post("/auth/register", payload);
  return response.data;
};

export const logout = async () => {
  const refreshToken = localStorage.getItem("refreshToken");
  const response = await api.post("/auth/logout", { refreshToken });
  return response.data;
};

export const forgotPassword = async ({ email }) => {
  const response = await api.post("/auth/forgot-password", { email });
  return response.data;
};

export const resetPassword = async ({ resetToken, password }) => {
  const response = await api.post("/auth/reset-password", { resetToken, password });
  return response.data;
};

export const getMe = async () => {
  const response = await api.get("/auth/me");
  return response.data;
};
