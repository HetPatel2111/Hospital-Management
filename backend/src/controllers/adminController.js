import * as adminService from "../services/adminService.js";
import * as doctorService from "../services/doctorService.js";
import asyncHandler from "../utils/asyncHandler.js";

export const getOverviewKPIs = asyncHandler(async (req, res) => {
  const result = await adminService.getOverviewKPIs();
  res.status(200).json({
    success: true,
    data: result,
    message: "Admin overview KPIs fetched successfully"
  });
});

export const getAppointmentAnalytics = asyncHandler(async (req, res) => {
  const result = await adminService.getAppointmentAnalytics();
  res.status(200).json({
    success: true,
    data: result,
    message: "Appointment analytics fetched successfully"
  });
});

export const getRevenueAnalytics = asyncHandler(async (req, res) => {
  const result = await adminService.getRevenueAnalytics();
  res.status(200).json({
    success: true,
    data: result,
    message: "Revenue analytics fetched successfully"
  });
});

export const getRefundAnalytics = asyncHandler(async (req, res) => {
  const result = await adminService.getRefundAnalytics();
  res.status(200).json({
    success: true,
    data: result,
    message: "Refund analytics fetched successfully"
  });
});

export const getDoctorAnalytics = asyncHandler(async (req, res) => {
  const result = await adminService.getDoctorAnalytics();
  res.status(200).json({
    success: true,
    data: result,
    message: "Doctor analytics fetched successfully"
  });
});

export const listPatients = asyncHandler(async (req, res) => {
  const result = await adminService.listPatients(req.validated.query);
  res.status(200).json({
    success: true,
    data: result,
    message: "Patients listed successfully"
  });
});

export const suspendPatient = asyncHandler(async (req, res) => {
  const result = await adminService.suspendPatient(req.validated.params.id, req.user);
  res.status(200).json({
    success: true,
    data: result,
    message: "Patient suspended successfully"
  });
});

export const reactivatePatient = asyncHandler(async (req, res) => {
  const result = await adminService.reactivatePatient(req.validated.params.id, req.user);
  res.status(200).json({
    success: true,
    data: result,
    message: "Patient reactivated successfully"
  });
});

export const listDoctorsAdmin = asyncHandler(async (req, res) => {
  const result = await doctorService.listDoctorsAdmin(req.validated.query);
  res.status(200).json({
    success: true,
    data: result,
    message: "Doctors listed for admin successfully"
  });
});
