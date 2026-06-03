import * as appointmentService from "../services/appointmentService.js";
import asyncHandler from "../utils/asyncHandler.js";

export const createAppointment = asyncHandler(async (req, res) => {
  const result = await appointmentService.createAppointment(req.user._id, req.validated.body);

  res.status(201).json({
    success: true,
    data: result,
    message: "Appointment created successfully"
  });
});

export const cancelAppointment = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { reason } = req.validated.body;
  const result = await appointmentService.cancelAppointment(id, req.user, reason);

  res.status(200).json({
    success: true,
    data: result,
    message: "Appointment cancelled successfully"
  });
});

export const rescheduleAppointment = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const result = await appointmentService.rescheduleAppointment(id, req.user, req.validated.body);

  res.status(200).json({
    success: true,
    data: result,
    message: "Appointment rescheduled successfully"
  });
});

export const confirmAppointment = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const result = await appointmentService.confirmAppointment(id, req.user);

  res.status(200).json({
    success: true,
    data: result,
    message: "Appointment confirmed successfully"
  });
});

export const completeAppointment = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const result = await appointmentService.completeAppointment(id, req.user);

  res.status(200).json({
    success: true,
    data: result,
    message: "Appointment marked as completed successfully"
  });
});

export const listAllAppointments = asyncHandler(async (req, res) => {
  const result = await appointmentService.listAllAppointments(req.validated.query);

  res.status(200).json({
    success: true,
    data: result,
    message: "Appointments fetched successfully"
  });
});

export const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const { status } = req.validated.body;
  const result = await appointmentService.updateAppointmentStatus(id, status, req.user);

  res.status(200).json({
    success: true,
    data: result,
    message: "Appointment status updated successfully"
  });
});

export const getAppointmentById = asyncHandler(async (req, res) => {
  const { id } = req.validated.params;
  const result = await appointmentService.getAppointmentById(id, req.user);

  res.status(200).json({
    success: true,
    data: result,
    message: "Appointment fetched successfully"
  });
});
