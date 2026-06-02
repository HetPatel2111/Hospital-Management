import asyncHandler from "../utils/asyncHandler.js";
import * as authService from "../services/authService.js";

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.validated.body);

  res.status(201).json({
    success: true,
    data: result,
    message: "User registered successfully"
  });
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.validated.body);

  res.status(200).json({
    success: true,
    data: result,
    message: "Logged in successfully"
  });
});

export const logout = asyncHandler(async (req, res) => {
  const result = await authService.logout();

  res.status(200).json({
    success: true,
    data: {},
    message: result.message
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.validated.body);

  res.status(200).json({
    success: true,
    data: result.resetToken ? { resetToken: result.resetToken } : {},
    message: result.message
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const result = await authService.resetPassword(req.validated.body);

  res.status(200).json({
    success: true,
    data: {},
    message: result.message
  });
});

export const me = asyncHandler(async (req, res) => {
  const result = await authService.getMe(req.user);

  res.status(200).json({
    success: true,
    data: result,
    message: "Authenticated user fetched successfully"
  });
});
