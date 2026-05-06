import mongoose from "mongoose";

const characterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
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
