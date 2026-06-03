import Patient from "../models/Patient.js";
import Doctor from "../models/Doctor.js";
import Appointment from "../models/Appointment.js";
import Payment from "../models/Payment.js";
import Refund from "../models/Refund.js";
import User from "../models/User.js";
import AppError from "../utils/AppError.js";
import { AUDIT_ACTIONS, createAuditLog } from "./auditService.js";

export const getOverviewKPIs = async () => {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setUTCHours(23, 59, 59, 999);

  const [
    totalPatients,
    totalDoctors,
    activeDoctors,
    totalAppointments,
    todayAppointments,
    pendingRefundRequests
  ] = await Promise.all([
    Patient.countDocuments(),
    Doctor.countDocuments(),
    Doctor.countDocuments({ status: "approved" }),
    Appointment.countDocuments(),
    Appointment.countDocuments({
      appointmentDate: { $gte: todayStart, $lte: todayEnd }
    }),
    Refund.countDocuments({ refundStatus: "requested" })
  ]);

  const revenueAggregate = await Payment.aggregate([
    { $match: { paymentStatus: "success" } },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);
  const totalRevenue = revenueAggregate[0]?.total || 0;

  const refundAggregate = await Refund.aggregate([
    { $match: { refundStatus: "refunded" } },
    { $group: { _id: null, total: { $sum: "$refundAmount" } } }
  ]);
  const totalRefunds = refundAggregate[0]?.total || 0;

  return {
    totalPatients,
    totalDoctors,
    activeDoctors,
    totalAppointments,
    todayAppointments,
    totalRevenue,
    totalRefunds,
    pendingRefundRequests
  };
};

export const getAppointmentAnalytics = async () => {
  const daily = await Appointment.aggregate([
    { $match: { status: { $ne: "pending_payment" } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$appointmentDate" } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const weekly = await Appointment.aggregate([
    { $match: { status: { $ne: "pending_payment" } } },
    {
      $group: {
        _id: {
          year: { $year: "$appointmentDate" },
          week: { $week: "$appointmentDate" }
        },
        count: { $sum: 1 }
      }
    },
    { $sort: { "_id.year": 1, "_id.week": 1 } }
  ]);

  const monthly = await Appointment.aggregate([
    { $match: { status: { $ne: "pending_payment" } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$appointmentDate" } },
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return { daily, weekly, monthly };
};

export const getRevenueAnalytics = async () => {
  const daily = await Payment.aggregate([
    { $match: { paymentStatus: "success" } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$paidAt" } },
        amount: { $sum: "$amount" }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const weekly = await Payment.aggregate([
    { $match: { paymentStatus: "success" } },
    {
      $group: {
        _id: {
          year: { $year: "$paidAt" },
          week: { $week: "$paidAt" }
        },
        amount: { $sum: "$amount" }
      }
    },
    { $sort: { "_id.year": 1, "_id.week": 1 } }
  ]);

  const monthly = await Payment.aggregate([
    { $match: { paymentStatus: "success" } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m", date: "$paidAt" } },
        amount: { $sum: "$amount" }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  return { daily, weekly, monthly };
};

export const getRefundAnalytics = async () => {
  const refundStatusCounts = await Refund.aggregate([
    {
      $group: {
        _id: "$refundStatus",
        count: { $sum: 1 },
        amount: { $sum: "$refundAmount" }
      }
    }
  ]);

  const stats = {
    requested: 0,
    approved: 0,
    rejected: 0,
    processing: 0,
    refunded: 0,
    refundedAmount: 0
  };

  refundStatusCounts.forEach((r) => {
    if (r._id in stats) {
      stats[r._id] = r.count;
    }
    if (r._id === "refunded") {
      stats.refundedAmount = r.amount;
    }
  });

  return stats;
};

export const getDoctorAnalytics = async () => {
  // Most Booked Doctors
  const mostBooked = await Appointment.aggregate([
    { $match: { status: { $ne: "pending_payment" } } },
    { $group: { _id: "$doctorId", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);

  const populatedMostBooked = await Doctor.populate(mostBooked, {
    path: "_id",
    populate: { path: "userId", select: "name" }
  });

  const formattedMostBooked = populatedMostBooked.map((item) => ({
    doctorId: item._id?._id || item._id,
    fullName: item._id?.userId?.name || "Unknown Doctor",
    specialization: item._id?.specialization || "Unknown Specialization",
    appointmentsCount: item.count,
    rating: item._id?.rating || 0
  }));

  // Top Revenue Doctors
  const topRevenue = await Payment.aggregate([
    { $match: { paymentStatus: "success" } },
    {
      $lookup: {
        from: "appointments",
        localField: "appointmentId",
        foreignField: "_id",
        as: "appt"
      }
    },
    { $unwind: "$appt" },
    {
      $group: {
        _id: "$appt.doctorId",
        revenue: { $sum: "$amount" }
      }
    },
    { $sort: { revenue: -1 } },
    { $limit: 5 }
  ]);

  const populatedTopRevenue = await Doctor.populate(topRevenue, {
    path: "_id",
    populate: { path: "userId", select: "name" }
  });

  const formattedTopRevenue = populatedTopRevenue.map((item) => ({
    doctorId: item._id?._id || item._id,
    fullName: item._id?.userId?.name || "Unknown Doctor",
    specialization: item._id?.specialization || "Unknown Specialization",
    revenue: item.revenue,
    rating: item._id?.rating || 0
  }));

  const [activeDoctors, suspendedDoctors] = await Promise.all([
    Doctor.countDocuments({ status: "approved" }),
    Doctor.countDocuments({ status: "rejected" }) // We map suspended to status rejected in this backend model
  ]);

  return {
    mostBooked: formattedMostBooked,
    topRevenue: formattedTopRevenue,
    activeDoctors,
    suspendedDoctors
  };
};

export const listPatients = async (query) => {
  const filters = {};
  const skip = (query.page - 1) * query.limit;

  if (query.search) {
    const matchingUsers = await User.find({
      $or: [
        { name: { $regex: query.search, $options: "i" } },
        { email: { $regex: query.search, $options: "i" } },
        { phone: { $regex: query.search, $options: "i" } }
      ],
      role: "patient"
    }).select("_id");

    filters.userId = { $in: matchingUsers.map((u) => u._id) };
  }

  const [patients, total] = await Promise.all([
    Patient.find(filters)
      .populate("userId", "name email phone status")
      .skip(skip)
      .limit(query.limit),
    Patient.countDocuments(filters)
  ]);

  return {
    patients,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit)
    }
  };
};

export const suspendPatient = async (patientId, actor = null) => {
  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new AppError("Patient not found", 404, "PATIENT_NOT_FOUND");
  }
  await User.findByIdAndUpdate(patient.userId, { status: "suspended" });

  if (actor) {
    await createAuditLog({
      actorId: actor._id,
      actorRole: actor.role,
      action: AUDIT_ACTIONS.ACCOUNT_SUSPENSION,
      resourceType: "users",
      resourceId: patient.userId
    });
  }
  return { success: true };
};

export const reactivatePatient = async (patientId, actor = null) => {
  const patient = await Patient.findById(patientId);
  if (!patient) {
    throw new AppError("Patient not found", 404, "PATIENT_NOT_FOUND");
  }
  await User.findByIdAndUpdate(patient.userId, { status: "active" });

  if (actor) {
    await createAuditLog({
      actorId: actor._id,
      actorRole: actor.role,
      action: "ACCOUNT_ACTIVATION",
      resourceType: "users",
      resourceId: patient.userId
    });
  }
  return { success: true };
};
