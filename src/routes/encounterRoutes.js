import express from "express";
import mongoose from "mongoose";
import Encounter from "../models/Encounter.js";

const router = express.Router();

const allowedEncounterUpdateFields = ["name", "status", "notes"];

const validateEncounterId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.encounterId)) {
    return res.status(400).json({ message: "Invalid encounter id" });
  }

  return next();
};

const buildEncounterFilters = (query) => {
  const filters = {};

  if (query.status) {
    filters.status = query.status.toLowerCase();
  }

  return filters;
};

const pickAllowedFields = (body) => {
  return Object.fromEntries(
    Object.entries(body).filter(([field]) => allowedEncounterUpdateFields.includes(field))
  );
};

router.get("/", async (req, res) => {
  try {
    const encounters = await Encounter.find(buildEncounterFilters(req.query)).sort({ createdAt: -1 });

    res.status(200).json(encounters);
  } catch (error) {
    console.log("Error in get encounters route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, notes } = req.body;

    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }

    const encounter = new Encounter({
      user: req.user._id,
      name,
      notes,
    });

    await encounter.save();

    res.status(201).json(encounter);
  } catch (error) {
    console.log("Error in create encounter route", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/:encounterId", validateEncounterId, async (req, res) => {
  try {
    const encounter = await Encounter.findById(req.params.encounterId);

    if (!encounter) {
      return res.status(404).json({ message: "Encounter not found" });
    }

    res.status(200).json(encounter);
  } catch (error) {
    console.log("Error in get encounter route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/:encounterId", validateEncounterId, async (req, res) => {
  try {
    const updates = pickAllowedFields(req.body);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid encounter fields provided" });
    }

    const encounter = await Encounter.findByIdAndUpdate(req.params.encounterId, updates, {
      new: true,
      runValidators: true,
    });

    if (!encounter) {
      return res.status(404).json({ message: "Encounter not found" });
    }

    res.status(200).json(encounter);
  } catch (error) {
    console.log("Error in update encounter route", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/:encounterId", validateEncounterId, async (req, res) => {
  try {
    const encounter = await Encounter.findByIdAndDelete(req.params.encounterId);

    if (!encounter) {
      return res.status(404).json({ message: "Encounter not found" });
    }

    res.status(200).json({ message: "Encounter deleted", encounter });
  } catch (error) {
    console.log("Error in delete encounter route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
