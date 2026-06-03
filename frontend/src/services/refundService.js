import api from "./api.js";

/**
 * Patient requests a refund for a cancelled appointment
 * @param {string} appointmentId 
 * @param {string} refundReason 
 * @returns {Promise<object>}
 */
export const requestRefund = async (appointmentId, refundReason) => {
  const response = await api.post("/refunds/request", { appointmentId, refundReason });
  return response.data;
};

/**
 * Fetch patient's private refund history
 * @returns {Promise<object>} Array of refund records
 */
export const getMyRefunds = async () => {
  const response = await api.get("/refunds/my-refunds");
  return response.data;
};

/**
 * Fetch all refund requests for admin dashboard
 * @param {object} params - query parameters (page, limit, status, patientId)
 * @returns {Promise<object>} Paginated refund requests
 */
export const getAdminRefunds = async (params = {}) => {
  const response = await api.get("/admin/refunds", { params });
  return response.data;
};

/**
 * Admin approves a refund request
 * @param {string} refundId 
 * @param {string} adminRemarks 
 * @returns {Promise<object>} Approved refund record
 */
export const approveRefund = async (refundId, adminRemarks = "") => {
  const response = await api.patch(`/admin/refunds/${refundId}/approve`, { adminRemarks });
  return response.data;
};

/**
 * Admin rejects a refund request
 * @param {string} refundId 
 * @param {string} adminRemarks 
 * @returns {Promise<object>} Rejected refund record
 */
export const rejectRefund = async (refundId, adminRemarks) => {
  const response = await api.patch(`/admin/refunds/${refundId}/reject`, { adminRemarks });
  return response.data;
};

/**
 * Admin processes the approved refund (Razorpay capture)
 * @param {string} refundId 
 * @returns {Promise<object>} Refunded record
 */
export const processRefund = async (refundId) => {
  const response = await api.patch(`/admin/refunds/${refundId}/process`);
  return response.data;
};
