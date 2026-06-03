import mongoose from "mongoose";

const medicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    dosage: {
      type: String,
      required: true,
      trim: true
    },
    frequency: {
      type: String,
      required: true,
      trim: true
    },
    duration: {
      type: String,
      required: true,
      trim: true
    },
    instructions: {
      type: String,
      trim: true,
      default: ""
    }
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
      unique: true,
      index: true
    },
    diagnosis: {
      type: String,
      required: true,
      trim: true
    },
    medicines: {
      type: [medicineSchema],
      default: []
    },
    instructions: {
      type: String,
      trim: true,
      default: ""
    },
    followUpDate: {
      type: Date
    }
  },
  {
    timestamps: true,
    collection: "prescriptions"
  }
);

prescriptionSchema.index({ createdAt: -1 });

const Prescription = mongoose.model("Prescription", prescriptionSchema);

export default Prescription;
