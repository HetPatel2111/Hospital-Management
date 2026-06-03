import * as paymentService from "../services/paymentService.js";
import asyncHandler from "../utils/asyncHandler.js";

export const createOrder = asyncHandler(async (req, res) => {
  const result = await paymentService.createOrder(req.user._id, req.validated.body.appointmentId);

  res.status(201).json({
    success: true,
    data: result,
    message: "Razorpay order created successfully"
  });
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const result = await paymentService.verifyPayment(req.user._id, req.validated.body);

  res.status(200).json({
    success: true,
    data: result,
    message: "Payment verified and appointment confirmed successfully"
  });
});

export const getPaymentById = asyncHandler(async (req, res) => {
  const result = await paymentService.getPaymentById(
    req.user._id,
    req.user.role,
    req.validated.params.id
  );

  res.status(200).json({
    success: true,
    data: result,
    message: "Payment details fetched successfully"
  });
});

export const getMyPayments = asyncHandler(async (req, res) => {
  const result = await paymentService.getMyPayments(req.user._id);

  res.status(200).json({
    success: true,
    data: result,
    message: "Patient payments fetched successfully"
  });
});

export const getAllPayments = asyncHandler(async (req, res) => {
  const result = await paymentService.getAllPayments(req.query);

  res.status(200).json({
    success: true,
    data: result.payments,
    pagination: result.pagination,
    message: "All payments fetched successfully"
  });
});
