import mongoose from "mongoose";

const levelUpSubmissionSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LevelUpSession",
      required: true,
      index: true,
    },

    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },

    character: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Character",
      required: true,
      index: true,
    },

    submittedByName: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "discarded"],
      default: "pending",
      index: true,
    },

    previousSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    patch: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true }
);

levelUpSubmissionSchema.index({ session: 1, character: 1 }, { unique: true });

const LevelUpSubmission = mongoose.model("LevelUpSubmission", levelUpSubmissionSchema);

export default LevelUpSubmission;
