import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "./src/config/db.js";
import User from "./src/models/User.js";
import Patient from "./src/models/Patient.js";
import Doctor from "./src/models/Doctor.js";
import Appointment from "./src/models/Appointment.js";
import Payment from "./src/models/Payment.js";
import Refund from "./src/models/Refund.js";
import Prescription from "./src/models/Prescription.js";

dotenv.config();

const seed = async () => {
  try {
    await connectDB();
    console.log("Database connected for seeding.");

    const password = "123456789";
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const patientEmails = Array.from({ length: 10 }, (_, i) => `user${i + 1}@gmail.com`);
    const doctorEmails = Array.from({ length: 10 }, (_, i) => `doctor${i + 1}@gmail.com`);
    const allEmails = [...patientEmails, ...doctorEmails, "admin@gmail.com"];

    console.log("Cleaning up existing test dataset...");
    const existingUsers = await User.find({ email: { $in: allEmails } });
    const userIds = existingUsers.map(u => u._id);

    await User.deleteMany({ _id: { $in: userIds } });
    
    // Find all patients/doctors linked to these user accounts to clean related records
    const patients = await Patient.find({});
    const doctors = await Doctor.find({});
    
    const cleanPatientIds = patients.map(p => p._id);
    const cleanDoctorIds = doctors.map(d => d._id);

    await Patient.deleteMany({});
    await Doctor.deleteMany({});
    await Appointment.deleteMany({});
    await Payment.deleteMany({});
    await Refund.deleteMany({});
    await Prescription.deleteMany({});

    console.log("Cleanup complete.");

    // Seed Admin
    console.log("Seeding Admin User...");
    const adminUser = await User.create({
      name: "Admin Manager",
      email: "admin@gmail.com",
      phone: "+15550000000",
      passwordHash,
      role: "admin",
      status: "active",
      emailVerified: true,
      phoneVerified: true,
    });

    // Seed Patients
    console.log("Seeding 10 Patients...");
    const patientDocs = [];
    for (let i = 0; i < 10; i++) {
      const email = `user${i + 1}@gmail.com`;
      const name = `Patient User ${i + 1}`;
      const phone = `+1555100000${i}`;

      const user = await User.create({
        name,
        email,
        phone,
        passwordHash,
        role: "patient",
        status: "active",
        emailVerified: true,
        phoneVerified: true,
      });

      const pDoc = await Patient.create({
        userId: user._id,
        gender: i % 2 === 0 ? "male" : "female",
        bloodGroup: ["A+", "B+", "AB+", "O+"][i % 4],
        dateOfBirth: new Date(1990 + i, i, 15),
        address: {
          line1: `${100 + i} Main St`,
          city: "New York",
          state: "NY",
          country: "USA",
          postalCode: "10001",
        },
        emergencyContact: {
          name: `Emergency Contact ${i + 1}`,
          phone: `+1555900000${i}`,
          relationship: "Relative",
        },
        allergies: i % 3 === 0 ? ["Penicillin"] : ["None"],
        currentMedications: i % 4 === 0 ? ["Multivitamins"] : ["None"],
        medicalHistory: i % 5 === 0 ? ["Seasonal Asthma"] : ["No major conditions"]
      });
      patientDocs.push(pDoc);
    }

    // Seed Doctors
    console.log("Seeding 10 Doctors...");
    const doctorDocs = [];
    const specializations = [
      "Cardiology", "Dermatology", "Pediatrics", "Orthopedics",
      "General Medicine", "Neurology", "Oncology", "Gynecology",
      "Psychiatry", "Radiology"
    ];

    for (let i = 0; i < 10; i++) {
      const email = `doctor${i + 1}@gmail.com`;
      const name = `Dr. Doctor User ${i + 1}`;
      const phone = `+1555200000${i}`;
      const spec = specializations[i % specializations.length];

      const user = await User.create({
        name,
        email,
        phone,
        passwordHash,
        role: "doctor",
        status: "active",
        emailVerified: true,
        phoneVerified: true,
      });

      const dDoc = await Doctor.create({
        userId: user._id,
        specialization: spec,
        qualification: ["MBBS", "MD"],
        experienceYears: 5 + i,
        registrationNumber: `REG-D100${i}`,
        consultationFee: 300 + i * 50,
        status: "approved",
        bio: `Experienced specialist in ${spec} with over ${5 + i} years of practice. Dedicated to providing patient-centered care.`,
        rating: 4.0 + (i % 10) * 0.1,
        availability: {
          weeklySchedule: [
            { dayOfWeek: 1, isAvailable: true, slots: [{ startTime: "09:00", endTime: "12:00" }, { startTime: "14:00", endTime: "17:00" }] },
            { dayOfWeek: 2, isAvailable: true, slots: [{ startTime: "09:00", endTime: "12:00" }, { startTime: "14:00", endTime: "17:00" }] },
            { dayOfWeek: 3, isAvailable: true, slots: [{ startTime: "09:00", endTime: "12:00" }, { startTime: "14:00", endTime: "17:00" }] },
            { dayOfWeek: 4, isAvailable: true, slots: [{ startTime: "09:00", endTime: "12:00" }, { startTime: "14:00", endTime: "17:00" }] },
            { dayOfWeek: 5, isAvailable: true, slots: [{ startTime: "09:00", endTime: "12:00" }, { startTime: "14:00", endTime: "17:00" }] }
          ]
        }
      });
      doctorDocs.push(dDoc);
    }

    console.log("Seeding Appointments, Payments, Refunds, and Prescriptions...");

    const makeAppointment = async ({ index, patient, doctor, status, paymentStatus, refundStatus, date, startTime, endTime, reason, diagnosis, medicines }) => {
      const apptDate = date || new Date();
      
      const appt = await Appointment.create({
        patientId: patient._id,
        doctorId: doctor._id,
        appointmentDate: apptDate,
        startTime: startTime || "10:00",
        endTime: endTime || "10:30",
        status: status,
        reason: reason || "Regular clinical checkup",
      });

      let payment = null;
      if (paymentStatus) {
        let paymentRefundStatus = "none";
        if (refundStatus && refundStatus !== "none") {
          paymentRefundStatus = refundStatus === "refunded" ? "refunded" : refundStatus === "requested" ? "requested" : "processing";
        }
        payment = await Payment.create({
          appointmentId: appt._id,
          patientId: patient._id,
          amount: doctor.consultationFee,
          currency: "INR",
          razorpayOrderId: `order_seed_${index}`,
          razorpayPaymentId: paymentStatus === "success" ? `pay_seed_${index}` : undefined,
          paymentStatus: paymentStatus,
          paymentMethod: paymentStatus === "success" ? "card" : undefined,
          paidAt: paymentStatus === "success" ? new Date() : undefined,
          refundStatus: paymentRefundStatus
        });

        appt.paymentId = payment._id;
        await appt.save();
      }

      if (refundStatus && refundStatus !== "none") {
        await Refund.create({
          appointmentId: appt._id,
          paymentId: payment._id,
          patientId: patient._id,
          amount: doctor.consultationFee,
          refundPercentage: refundStatus === "refunded" ? 100 : 50,
          refundAmount: refundStatus === "refunded" ? doctor.consultationFee : doctor.consultationFee * 0.5,
          refundReason: "Emergency patient schedule override conflict",
          refundStatus: refundStatus === "refunded" ? "refunded" : refundStatus === "requested" ? "requested" : "approved"
        });
      }

      if (diagnosis) {
        await Prescription.create({
          appointmentId: appt._id,
          diagnosis,
          medicines: medicines || [{ name: "Amoxicillin 500mg", dosage: "1 capsule", frequency: "3 times daily", duration: "7 days" }],
          instructions: "Take after food with plenty of warm water. Rest well."
        });
      }

      return appt;
    };

    const today = new Date();

    // 1. Completed checkup for user1 with doctor1
    await makeAppointment({
      index: 1,
      patient: patientDocs[0],
      doctor: doctorDocs[0],
      status: "completed",
      paymentStatus: "success",
      reason: "Experiencing mild high blood pressure",
      diagnosis: "Essential Hypertension",
      medicines: [
        { name: "Amlodipine 5mg", dosage: "1 tablet", frequency: "Once daily in morning", duration: "30 days" },
        { name: "Multivitamins", dosage: "1 tablet", frequency: "Once daily", duration: "15 days" }
      ]
    });

    // 2. Completed checkup for user2 with doctor2
    await makeAppointment({
      index: 2,
      patient: patientDocs[1],
      doctor: doctorDocs[1],
      status: "completed",
      paymentStatus: "success",
      reason: "Skin allergy and rashes on arm",
      diagnosis: "Acute Contact Dermatitis",
      medicines: [
        { name: "Cetirizine 10mg", dosage: "1 tablet", frequency: "Once daily at night", duration: "10 days" },
        { name: "Hydrocortisone Cream 1%", dosage: "Apply thin layer", frequency: "Twice daily", duration: "5 days" }
      ]
    });

    // 3. Fully Refunded booking for user3 with doctor3
    await makeAppointment({
      index: 3,
      patient: patientDocs[2],
      doctor: doctorDocs[2],
      status: "refunded",
      paymentStatus: "refunded",
      refundStatus: "refunded",
      reason: "Fever and cold symptoms"
    });

    // 4. Refund Requested booking for user4 with doctor4
    await makeAppointment({
      index: 4,
      patient: patientDocs[3],
      doctor: doctorDocs[3],
      status: "refund_requested",
      paymentStatus: "success",
      refundStatus: "requested",
      reason: "Knee joint pain after workout"
    });

    // 5. Confirmed future booking for user5 with doctor5 (scheduled tomorrow)
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    await makeAppointment({
      index: 5,
      patient: patientDocs[4],
      doctor: doctorDocs[4],
      status: "confirmed",
      paymentStatus: "success",
      date: tomorrow,
      startTime: "11:00",
      endTime: "11:30",
      reason: "Routine health checkup"
    });

    // 6. Completed checkup for user6 with doctor6
    await makeAppointment({
      index: 6,
      patient: patientDocs[5],
      doctor: doctorDocs[5],
      status: "completed",
      paymentStatus: "success",
      reason: "Frequent headaches and migraine history",
      diagnosis: "Migraine with Aura",
      medicines: [
        { name: "Sumatriptan 50mg", dosage: "1 tablet", frequency: "Take at onset of aura", duration: "6 units" },
        { name: "Propranolol 40mg", dosage: "1 tablet", frequency: "Once daily", duration: "30 days" }
      ]
    });

    // 7. Completed checkup for user7 with doctor7
    await makeAppointment({
      index: 7,
      patient: patientDocs[6],
      doctor: doctorDocs[6],
      status: "completed",
      paymentStatus: "success",
      reason: "Dry cough and shortness of breath",
      diagnosis: "Mild Persistent Asthma",
      medicines: [
        { name: "Albuterol Inhaler", dosage: "2 puffs", frequency: "Every 4 hours as needed", duration: "1 inhaler" }
      ]
    });

    // 8. Cancelled booking for user8 with doctor8 (failed checkout)
    await makeAppointment({
      index: 8,
      patient: patientDocs[7],
      doctor: doctorDocs[7],
      status: "cancelled",
      paymentStatus: "failed",
      reason: "Ear ache and sore throat"
    });

    // 9. Pending Payment booking for user9 with doctor9
    await makeAppointment({
      index: 9,
      patient: patientDocs[8],
      doctor: doctorDocs[8],
      status: "pending_payment",
      reason: "Anxiety and sleep issues"
    });

    // 10. Approved Refund flow for user10 with doctor10
    await makeAppointment({
      index: 10,
      patient: patientDocs[9],
      doctor: doctorDocs[9],
      status: "refund_processing",
      paymentStatus: "success",
      refundStatus: "approved",
      reason: "Consultation follow up schedule conflict"
    });

    // 11. Completed booking #2 for user1 with doctor2
    await makeAppointment({
      index: 11,
      patient: patientDocs[0],
      doctor: doctorDocs[1],
      status: "completed",
      paymentStatus: "success",
      reason: "Stomach ache and nausea",
      diagnosis: "Mild Viral Gastroenteritis",
      medicines: [
        { name: "ORS Hydration Sachet", dosage: "1 packet in 1L water", frequency: "Drink continuously", duration: "3 days" },
        { name: "Ondansetron 4mg", dosage: "1 tablet", frequency: "Twice daily as needed", duration: "3 days" }
      ]
    });

    console.log("Seeding complete successfully!");
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};

seed();
