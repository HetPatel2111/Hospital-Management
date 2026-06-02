import mongoose from "mongoose";

const availabilitySlotSchema = new mongoose.Schema(
  {
    startTime: {
      type: String,
      required: true,
      trim: true
    },
    endTime: {
      type: String,
      required: true,
      trim: true
    }
  },
  { _id: false }
);

const weeklyScheduleSchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6
    },
    isAvailable: {
      type: Boolean,
      default: false
    },
    slots: {
      type: [availabilitySlotSchema],
      default: []
    }
  },
  { _id: false }
);

const availabilityExceptionSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true
    },
    isAvailable: {
      type: Boolean,
      default: false
    },
    reason: {
      type: String,
      trim: true
    }
  },
  { _id: false }
);

const doctorSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    specialization: {
      type: String,
      required: true,
      trim: true
    },
    qualification: {
      type: [String],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: "At least one qualification is required"
      }
    },
    experienceYears: {
      type: Number,
      required: true,
      min: 0
    },
    registrationNumber: {
      type: String,
      required: true,
      trim: true
    },
    consultationFee: {
      type: Number,
      required: true,
      min: 0
    },
    availability: {
      weeklySchedule: {
        type: [weeklyScheduleSchema],
        default: []
      },
      exceptions: {
        type: [availabilityExceptionSchema],
        default: []
      }
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      required: true
    },
    bio: {
      type: String,
      trim: true,
      default: ""
    }
  },
  {
    timestamps: true,
    collection: "doctors",
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

doctorSchema.index({ userId: 1 }, { unique: true });
doctorSchema.index({ registrationNumber: 1 }, { unique: true });
doctorSchema.index({ specialization: 1 });
doctorSchema.index({ status: 1 });
doctorSchema.index({ consultationFee: 1 });
doctorSchema.index({ specialization: 1, status: 1 });
doctorSchema.index({ experienceYears: 1 });

doctorSchema.virtual("fullName").get(function getFullName() {
  return this.userId?.name;
});

doctorSchema.virtual("rating").get(function getRating() {
  return 0;
});

doctorSchema.virtual("availabilityStatus").get(function getAvailabilityStatus() {
  if (this.status !== "approved" || this.userId?.status === "suspended") {
    return "inactive";
  }

  const hasAvailableSlot = this.availability?.weeklySchedule?.some(
    (day) => day.isAvailable && day.slots?.length > 0
  );

  return hasAvailableSlot ? "available" : "unavailable";
});

const Doctor = mongoose.model("Doctor", doctorSchema);

export default Doctor;
