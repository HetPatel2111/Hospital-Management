import Appointment from "../models/Appointment.js";
import Notification from "../models/Notification.js";

export const checkUpcomingAppointments = async () => {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const appointments = await Appointment.find({
    status: "confirmed",
    appointmentDate: { $gte: now, $lte: tomorrow }
  })
    .populate({ path: "doctorId", populate: { path: "userId" } })
    .populate({ path: "patientId", populate: { path: "userId" } });

  for (const appointment of appointments) {
    const patientUserId = appointment.patientId?.userId?._id || appointment.patientId?.userId;
    if (!patientUserId) continue;

    const reminderExists = await Notification.exists({
      userId: patientUserId,
      type: "appointment",
      title: "Upcoming Appointment Reminder",
      "metadata.appointmentId": appointment._id
    });

    if (!reminderExists) {
      await Notification.create({
        userId: patientUserId,
        type: "appointment",
        title: "Upcoming Appointment Reminder",
        message: `Reminder: You have an upcoming appointment with Dr. ${appointment.doctorId?.userId?.name || "your doctor"} on ${appointment.appointmentDate.toDateString()} at ${appointment.startTime}.`,
        metadata: { appointmentId: appointment._id }
      });
    }
  }
};

export const startReminderJob = () => {
  // Check immediately on startup
  checkUpcomingAppointments().catch((err) => {
    console.error("Failed to run initial upcoming appointments reminder check:", err);
  });

  // Run check every hour
  setInterval(() => {
    checkUpcomingAppointments().catch((err) => {
      console.error("Failed to run periodic upcoming appointments reminder check:", err);
    });
  }, 60 * 60 * 1000);
};
