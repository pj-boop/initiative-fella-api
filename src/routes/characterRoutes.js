import express from "express";
import mongoose from "mongoose";
import Character from "../models/Character.js";

const router = express.Router();

const allowedUpdateFields = [
  "name",
  "type",
  "maxHp",
  "armorClass",
  "initiativeBonus",
  "stats",
  "consumables",
  "notes",
];

const validateCharacterId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.characterId)) {
    return res.status(400).json({ message: "Invalid character id" });
  }

  return next();
};

const buildCharacterFilters = (query) => {
  const filters = {};

  if (query.type) {
    filters.type = query.type.toLowerCase();
  }

  return filters;
};

router.get("/", async (req, res) => {
  try {
    const characters = await Character.find({
      user: req.user._id,
      ...buildCharacterFilters(req.query),
    }).sort({ createdAt: -1 });

    res.status(200).json(characters);
  } catch (error) {
    console.log("Error in get characters route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, type, maxHp, armorClass, initiativeBonus, stats, consumables, notes } = req.body;

    if (!name || !type || maxHp === undefined || maxHp === null) {
      return res.status(400).json({ message: "name, type, and maxHp are required" });
    }

    const character = new Character({
      user: req.user._id,
      name,
      type,
      maxHp,
      armorClass,
      initiativeBonus,
      stats,
      consumables,
      notes,
    });

    await character.save();

    res.status(201).json(character);
  } catch (error) {
    console.log("Error in create character route", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/:characterId", validateCharacterId, async (req, res) => {
  try {
    const character = await Character.findOne({
      _id: req.params.characterId,
      user: req.user._id,
    });

    if (!character) {
      return res.status(404).json({ message: "Character not found" });
    }

    res.status(200).json(character);
  } catch (error) {
    console.log("Error in get character route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/:characterId", validateCharacterId, async (req, res) => {
  try {
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([field]) => allowedUpdateFields.includes(field))
    );

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid character fields provided" });
    }

    const character = await Character.findOneAndUpdate(
      {
        _id: req.params.characterId,
        user: req.user._id,
      },
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!character) {
      return res.status(404).json({ message: "Character not found" });
    }

    res.status(200).json(character);
  } catch (error) {
    console.log("Error in update character route", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/:characterId", validateCharacterId, async (req, res) => {
  try {
    const character = await Character.findOneAndDelete({
      _id: req.params.characterId,
      user: req.user._id,
    });

    if (!character) {
      return res.status(404).json({ message: "Character not found" });
    }

    res.status(200).json({ message: "Character deleted", character });
  } catch (error) {
    console.log("Error in delete character route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
