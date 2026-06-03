import * as patientService from "../services/patientService.js";
import asyncHandler from "../utils/asyncHandler.js";

export const getMyProfile = asyncHandler(async (req, res) => {
  const result = await patientService.getMyProfile(req.user);

  res.status(200).json({
    success: true,
    data: result,
    message: "Patient profile fetched successfully"
  });
});

export const updateMyProfile = asyncHandler(async (req, res) => {
  const result = await patientService.updateMyProfile(req.user, req.validated.body);

  res.status(200).json({
    success: true,
    data: result,
    message: "Patient profile updated successfully"
  });
});

export const uploadProfilePicture = asyncHandler(async (req, res) => {
  const result = await patientService.uploadProfilePicture(
    req.user,
    req.validated.body.profilePictureUrl
  );

  res.status(200).json({
    success: true,
    data: result,
    message: "Patient profile picture updated successfully"
  });
});

export const getDashboard = asyncHandler(async (req, res) => {
  const result = await patientService.getDashboard(req.user);

  res.status(200).json({
    success: true,
    data: result,
    message: "Patient dashboard fetched successfully"
  });
});

export const listNotifications = asyncHandler(async (req, res) => {
  const result = await patientService.listNotifications(req.user, req.validated.query);

  res.status(200).json({
    success: true,
    data: result,
    message: "Patient notifications fetched successfully"
  });
});

export const listAppointmentHistory = asyncHandler(async (req, res) => {
  const result = await patientService.listAppointments(req.user, req.validated.query, "history");

  res.status(200).json({
    success: true,
    data: result,
    message: "Patient appointment history fetched successfully"
  });
});

export const listUpcomingAppointments = asyncHandler(async (req, res) => {
  const result = await patientService.listAppointments(req.user, req.validated.query, "upcoming");

  res.status(200).json({
    success: true,
    data: result,
    message: "Upcoming appointments fetched successfully"
  });
});

export const listCompletedAppointments = asyncHandler(async (req, res) => {
  const result = await patientService.listAppointments(req.user, req.validated.query, "completed");

  res.status(200).json({
    success: true,
    data: result,
    message: "Completed appointments fetched successfully"
  });
});

export const listCancelledAppointments = asyncHandler(async (req, res) => {
  const result = await patientService.listAppointments(req.user, req.validated.query, "cancelled");

  res.status(200).json({
    success: true,
    data: result,
    message: "Cancelled appointments fetched successfully"
  });
});
