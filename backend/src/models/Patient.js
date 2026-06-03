import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    line1: { type: String, trim: true, default: "" },
    line2: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    state: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "" },
    postalCode: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    relationship: { type: String, trim: true, default: "" }
  },
  { _id: false }
);

const insuranceDetailsSchema = new mongoose.Schema(
  {
    provider: { type: String, trim: true, default: "" },
    policyNumber: { type: String, trim: true, default: "" },
    validUntil: { type: Date }
  },
  { _id: false }
);

const patientSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    profilePictureUrl: {
      type: String,
      trim: true,
      default: ""
    },
    dateOfBirth: {
      type: Date,
      validate: {
        validator: (value) => !value || value <= new Date(),
        message: "Date of birth cannot be in the future"
      }
    },
    gender: {
      type: String,
      enum: ["male", "female", "other", "undisclosed"],
      default: "undisclosed"
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"],
      default: "unknown"
    },
    address: {
      type: addressSchema,
      default: () => ({})
    },
    emergencyContact: {
      type: emergencyContactSchema,
      default: () => ({})
    },
    medicalHistory: {
      type: [String],
      default: []
    },
    allergies: {
      type: [String],
      default: []
    },
    currentMedications: {
      type: [String],
      default: []
    },
    insuranceDetails: {
      type: insuranceDetailsSchema,
      default: () => ({})
    }
  },
  {
    timestamps: true,
    collection: "patients"
  }
);

patientSchema.index({ userId: 1 }, { unique: true });
patientSchema.index({ bloodGroup: 1 });
patientSchema.index({ createdAt: 1 });

const Patient = mongoose.model("Patient", patientSchema);

export default Patient;
