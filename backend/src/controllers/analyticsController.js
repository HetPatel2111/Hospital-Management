import * as analyticsService from "../services/analyticsService.js";
import asyncHandler from "../utils/asyncHandler.js";

export const getDoctorOverview = asyncHandler(async (req, res) => {
  const result = await analyticsService.getDoctorOverview(req.user._id);

  res.status(200).json({
    success: true,
    data: result,
    message: "Doctor analytics overview fetched successfully"
  });
});
