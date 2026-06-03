import api from "./api.js";

/**
 * Create Razorpay Order on the backend
 * @param {string} appointmentId 
 * @returns {Promise<object>} Response containing keyId, orderId, amount, currency, and paymentId
 */
export const createPaymentOrder = async (appointmentId) => {
  const response = await api.post("/payments/create-order", { appointmentId });
  return response.data;
};

/**
 * Verify payment signatures on the backend
 * @param {object} payload - containing appointmentId, razorpayOrderId, razorpayPaymentId, razorpaySignature, and gatewayResponse metadata
 * @returns {Promise<object>} Verification success response
 */
export const verifyPayment = async (payload) => {
  const response = await api.post("/payments/verify", payload);
  return response.data;
};

/**
 * Get detailed transaction logs for a single payment
 * @param {string} paymentId 
 * @returns {Promise<object>} Detailed payment record
 */
export const getPaymentDetails = async (paymentId) => {
  const response = await api.get(`/payments/${paymentId}`);
  return response.data;
};

/**
 * Fetch patient's private transaction histories
 * @returns {Promise<object>} Array of payment records
 */
export const getMyPayments = async () => {
  const response = await api.get("/payments/my-payments");
  return response.data;
};

/**
 * Fetch administrative payments database with filters and pagination
 * @param {object} params - query parameters (page, limit, status, refundStatus, patientId, doctorId)
 * @returns {Promise<object>} Paginated payments payload
 */
export const getAdminPayments = async (params = {}) => {
  const response = await api.get("/admin/payments", { params });
  return response.data;
};
