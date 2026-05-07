import mongoose from "mongoose";

const characterSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    type: {
      type: String,
      required: true,
      enum: ["player", "npc", "monster"],
      lowercase: true,
      trim: true,
    },

    maxHp: {
      type: Number,
      required: true,
      min: 0,
    },

    armorClass: {
      type: Number,
      default: 10,
      min: 0,
    },

    initiativeBonus: {
      type: Number,
      default: 0,
    },

    stats: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    consumables: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

const Character = mongoose.model("Character", characterSchema);

export default Character;
