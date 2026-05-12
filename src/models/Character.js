import mongoose from "mongoose";

const integerValidator = {
  validator: Number.isInteger,
  message: "{PATH} must be an integer",
};

const consumableUsesAreIntegers = {
  validator: (consumables) => {
    return consumables.every((consumable) => {
      if (!consumable || typeof consumable !== "object") {
        return true;
      }

      return ["maxUses", "currentUses"].every((field) => {
        const value = consumable[field];
        return value === undefined || value === null || Number.isInteger(Number(value));
      });
    });
  },
  message: "consumable maxUses and currentUses must be integers",
};

const dispositionByType = {
  player: "friendly",
  npc: "neutral",
  monster: "hostile",
};

const characterSchema = new mongoose.Schema(
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

    type: {
      type: String,
      required: true,
      enum: ["player", "npc", "monster"],
      lowercase: true,
      trim: true,
    },

    disposition: {
      type: String,
      enum: ["friendly", "hostile", "neutral"],
      lowercase: true,
      trim: true,
      default: function () {
        return dispositionByType[this.type] ?? "neutral";
      },
    },

    maxHp: {
      type: Number,
      required: true,
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

    stats: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    consumables: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
      validate: consumableUsesAreIntegers,
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
