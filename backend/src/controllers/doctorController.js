import * as doctorService from "../services/doctorService.js";
import asyncHandler from "../utils/asyncHandler.js";

export const listDoctors = asyncHandler(async (req, res) => {
  const result = await doctorService.listDoctors(req.validated.query);

  res.status(200).json({
    success: true,
    data: result,
    message: "Doctors fetched successfully"
  });
});

export const getDoctorById = asyncHandler(async (req, res) => {
  const result = await doctorService.getDoctorById(req.validated.params.id);

  res.status(200).json({
    success: true,
    data: result,
    message: "Doctor fetched successfully"
  });
});

export const getMyDoctorProfile = asyncHandler(async (req, res) => {
  const result = await doctorService.getMyDoctorProfile(req.user._id);

  res.status(200).json({
    success: true,
    data: result,
    message: "Doctor profile fetched successfully"
  });
});

export const updateMyDoctorProfile = asyncHandler(async (req, res) => {
  const result = await doctorService.updateMyDoctorProfile(req.user._id, req.validated.body);

  res.status(200).json({
    success: true,
    data: result,
    message: "Doctor profile updated successfully"
  });
});

export const updateMyAvailability = asyncHandler(async (req, res) => {
  const result = await doctorService.updateMyAvailability(
    req.user._id,
    req.validated.body.availability
  );

  res.status(200).json({
    success: true,
    data: result,
    message: "Doctor availability updated successfully"
  });
});

export const getPendingDoctors = asyncHandler(async (req, res) => {
  const result = await doctorService.getPendingDoctors();

  res.status(200).json({
    success: true,
    data: result,
    message: "Pending doctors fetched successfully"
  });
});

export const createDoctor = asyncHandler(async (req, res) => {
  const result = await doctorService.createDoctor(req.validated.body);

  res.status(201).json({
    success: true,
    data: result,
    message: "Doctor created successfully"
  });
});

export const updateDoctor = asyncHandler(async (req, res) => {
  const result = await doctorService.updateDoctor(req.validated.params.id, req.validated.body);

  res.status(200).json({
    success: true,
    data: result,
    message: "Doctor updated successfully"
  });
});

export const deleteDoctor = asyncHandler(async (req, res) => {
  const result = await doctorService.deleteDoctor(req.validated.params.id, req.user);

  res.status(200).json({
    success: true,
    data: {},
    message: result.message
  });
});

export const activateDoctor = asyncHandler(async (req, res) => {
  const result = await doctorService.activateDoctor(req.validated.params.id, req.user);

  res.status(200).json({
    success: true,
    data: result,
    message: "Doctor activated successfully"
  });
});

export const rejectDoctor = asyncHandler(async (req, res) => {
  const result = await doctorService.rejectDoctor(req.validated.params.id, req.user);

  res.status(200).json({
    success: true,
    data: result,
    message: "Doctor rejected successfully"
  });
});

export const deactivateDoctor = asyncHandler(async (req, res) => {
  const result = await doctorService.deactivateDoctor(req.validated.params.id, req.user);

  res.status(200).json({
    success: true,
    data: result,
    message: "Doctor deactivated successfully"
  });
});
