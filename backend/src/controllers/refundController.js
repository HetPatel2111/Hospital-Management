import * as refundService from "../services/refundService.js";
import asyncHandler from "../utils/asyncHandler.js";

export const requestRefund = asyncHandler(async (req, res) => {
  const result = await refundService.requestRefund(
    req.user._id,
    req.validated.body.appointmentId,
    req.validated.body.refundReason
  );

  res.status(201).json({
    success: true,
    data: result,
    message: "Refund request submitted successfully"
  });
});

export const getMyRefunds = asyncHandler(async (req, res) => {
  const result = await refundService.getMyRefunds(req.user._id);

  res.status(200).json({
    success: true,
    data: result,
    message: "Refund logs retrieved successfully"
  });
});

export const getAllRefunds = asyncHandler(async (req, res) => {
  const result = await refundService.getAllRefunds(req.query);

  res.status(200).json({
    success: true,
    data: result.refunds,
    pagination: result.pagination,
    message: "All refund requests fetched successfully"
  });
});

export const approveRefund = asyncHandler(async (req, res) => {
  const result = await refundService.approveRefund(
    req.user._id,
    req.validated.params.id,
    req.validated.body.adminRemarks
  );

  res.status(200).json({
    success: true,
    data: result,
    message: "Refund request approved successfully"
  });
});

export const rejectRefund = asyncHandler(async (req, res) => {
  const result = await refundService.rejectRefund(
    req.user._id,
    req.validated.params.id,
    req.validated.body.adminRemarks
  );

  res.status(200).json({
    success: true,
    data: result,
    message: "Refund request rejected successfully"
  });
});

export const processRefund = asyncHandler(async (req, res) => {
  const result = await refundService.processRefund(
    req.user._id,
    req.validated.params.id
  );

  res.status(200).json({
    success: true,
    data: result,
    message: "Refund processed successfully through gateway integration"
  });
});
