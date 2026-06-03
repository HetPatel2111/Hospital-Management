import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "./src/config/db.js";
import User from "./src/models/User.js";
import Patient from "./src/models/Patient.js";
import Doctor from "./src/models/Doctor.js";

dotenv.config();

const seed = async () => {
  try {
    await connectDB();
    console.log("Database connected for seeding.");

    const password = "123456789";
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // List of emails to clean up
    const patientEmails = Array.from({ length: 10 }, (_, i) => `user${i + 1}@gmail.com`);
    const doctorEmails = Array.from({ length: 10 }, (_, i) => `doctor${i + 1}@gmail.com`);
    const allEmails = [...patientEmails, ...doctorEmails];

    // Clean up existing records to prevent unique key violations
    console.log("Cleaning up existing test dataset...");
    const existingUsers = await User.find({ email: { $in: allEmails } });
    const userIds = existingUsers.map(u => u._id);

    await User.deleteMany({ _id: { $in: userIds } });
    await Patient.deleteMany({ userId: { $in: userIds } });
    await Doctor.deleteMany({ userId: { $in: userIds } });
    console.log("Cleanup complete.");

    // Seed Patients
    console.log("Seeding 10 Patients...");
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

      await Patient.create({
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
      });
    }

    // Seed Doctors
    console.log("Seeding 10 Doctors...");
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

      await Doctor.create({
        userId: user._id,
        specialization: spec,
        qualification: ["MBBS", "MD"],
        experienceYears: 5 + i,
        registrationNumber: `REG-D100${i}`,
        consultationFee: 50 + i * 15,
        status: "approved",
        bio: `Experienced specialist in ${spec} with over ${5 + i} years of practice. Dedicated to providing patient-centered care.`,
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
    }

    console.log("Seeding complete successfully!");
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};

seed();
