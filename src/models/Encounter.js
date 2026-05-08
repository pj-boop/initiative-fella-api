import mongoose from "mongoose";

const integerValidator = {
  validator: Number.isInteger,
  message: "{PATH} must be an integer",
};

const nullableIntegerValidator = {
  validator: (value) => value === null || Number.isInteger(value),
  message: "{PATH} must be an integer",
};

const initiativeEntryConsumableSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    maxUses: {
      type: Number,
      required: true,
      min: 0,
      validate: integerValidator,
    },
    currentUses: {
      type: Number,
      required: true,
      min: 0,
      validate: integerValidator,
    },
    resetOn: {
      type: String,
      enum: ["shortRest", "longRest", "never"],
      default: "never",
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

const initiativeEntrySchema = new mongoose.Schema(
  {
    characterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Character",
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
      validate: integerValidator,
    },
    currentHp: {
      type: Number,
      required: true,
      min: 0,
      validate: integerValidator,
      default: function () {
        return this.maxHp;
      },
    },
    tempHp: {
      type: Number,
      default: 0,
      min: 0,
      validate: integerValidator,
    },
    armorClass: {
      type: Number,
      default: 10,
      min: 0,
      validate: integerValidator,
    },
    initiativeBonus: {
      type: Number,
      default: 0,
      validate: integerValidator,
    },
    initiativeRoll: {
      type: Number,
      default: null,
      validate: nullableIntegerValidator,
    },
    initiativeTotal: {
      type: Number,
      default: null,
    },
    stats: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    consumables: {
      type: [initiativeEntryConsumableSchema],
      default: () => [],
    },
    conditions: {
      type: [String],
      default: () => [],
    },
    status: {
      type: String,
      enum: ["active", "down", "dead", "removed"],
      default: "active",
      lowercase: true,
      trim: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

const encounterSchema = new mongoose.Schema(
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
    name: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["draft", "active", "completed"],
      default: "draft",
      lowercase: true,
      trim: true,
    },
    round: {
      type: Number,
      default: 1,
      min: 1,
      validate: integerValidator,
    },
    currentTurnIndex: {
      type: Number,
      default: 0,
      min: 0,
    },
    entries: {
      type: [initiativeEntrySchema],
      default: () => [],
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

const Encounter = mongoose.model("Encounter", encounterSchema);

export default Encounter;
