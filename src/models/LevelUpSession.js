import mongoose from "mongoose";

const levelUpSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    campaign: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Campaign",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    targetLevel: {
      type: Number,
      required: true,
      min: 1,
      max: 20,
      validate: {
        validator: Number.isInteger,
        message: "{PATH} must be an integer",
      },
    },

    tokenHash: {
      type: String,
      index: true,
      unique: true,
      sparse: true,
    },

    status: {
      type: String,
      enum: ["open", "completed", "discarded", "closed"],
      default: "open",
      index: true,
    },

    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    allowedCharacterIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Character",
      },
    ],
  },
  { timestamps: true }
);

const LevelUpSession = mongoose.model("LevelUpSession", levelUpSessionSchema);

export default LevelUpSession;
