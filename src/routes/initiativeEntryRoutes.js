import express from "express";
import mongoose from "mongoose";
import Character from "../models/Character.js";
import Encounter from "../models/Encounter.js";

const router = express.Router({ mergeParams: true });

const allowedEntryUpdateFields = [
  "name",
  "type",
  "maxHp",
  "currentHp",
  "tempHp",
  "armorClass",
  "initiativeBonus",
  "initiativeRoll",
  "stats",
  "consumables",
  "conditions",
  "status",
  "notes",
];

const allowedConsumableUpdateFields = ["name", "maxUses", "currentUses", "resetOn", "notes"];

const validateEncounterId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.encounterId)) {
    return res.status(400).json({ message: "Invalid encounter id" });
  }

  return next();
};

const validateEntryId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.entryId)) {
    return res.status(400).json({ message: "Invalid entry id" });
  }

  return next();
};

const validateConsumableId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.consumableId)) {
    return res.status(400).json({ message: "Invalid consumable id" });
  }

  return next();
};

const pickAllowedFields = (body, allowedFields = allowedEntryUpdateFields) => {
  return Object.fromEntries(Object.entries(body).filter(([field]) => allowedFields.includes(field)));
};

const recalculateInitiativeTotal = (entry) => {
  if (entry.initiativeRoll === null || entry.initiativeRoll === undefined) {
    entry.initiativeTotal = null;
    return;
  }

  entry.initiativeTotal = entry.initiativeRoll + (entry.initiativeBonus ?? 0);
};

const findEncounterEntry = async (encounterId, entryId, userId) => {
  const encounter = await Encounter.findOne({
    _id: encounterId,
    user: userId,
  });

  if (!encounter) {
    return { encounter: null, entry: null };
  }

  return { encounter, entry: encounter.entries.id(entryId) };
};

const findEntryOrRespond = async (req, res) => {
  const { encounter, entry } = await findEncounterEntry(
    req.params.encounterId,
    req.params.entryId,
    req.user._id
  );

  if (!encounter) {
    res.status(404).json({ message: "Encounter not found" });
    return null;
  }

  if (!entry) {
    res.status(404).json({ message: "Entry not found" });
    return null;
  }

  return { encounter, entry };
};

const findConsumableOrRespond = async (req, res) => {
  const result = await findEntryOrRespond(req, res);

  if (!result) {
    return null;
  }

  const consumable = result.entry.consumables.id(req.params.consumableId);

  if (!consumable) {
    res.status(404).json({ message: "Consumable not found" });
    return null;
  }

  return { ...result, consumable };
};

const getNonNegativeAmount = (amount) => {
  const parsedAmount = Number(amount);

  if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
    return null;
  }

  return parsedAmount;
};

const getPositiveAmount = (amount) => {
  const parsedAmount = Number(amount);

  if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
    return null;
  }

  return parsedAmount;
};

const normalizeCondition = (condition) => {
  if (typeof condition !== "string") {
    return "";
  }

  return condition.trim().toLowerCase();
};

const buildEntrySnapshot = ({
  characterId,
  name,
  type,
  maxHp,
  currentHp,
  tempHp,
  armorClass,
  initiativeBonus,
  initiativeRoll,
  stats,
  consumables,
  conditions,
  status,
  notes,
}) => {
  const entry = {
    characterId,
    name,
    type,
    maxHp,
    currentHp: currentHp ?? maxHp,
    tempHp,
    armorClass,
    initiativeBonus,
    initiativeRoll,
    stats,
    consumables,
    conditions,
    status,
    notes,
  };

  recalculateInitiativeTotal(entry);

  return entry;
};

router.post("/from-character", validateEncounterId, async (req, res) => {
  try {
    const { characterId } = req.body;

    if (!characterId) {
      return res.status(400).json({ message: "characterId is required" });
    }

    if (!mongoose.isValidObjectId(characterId)) {
      return res.status(400).json({ message: "Invalid character id" });
    }

    const [encounter, character] = await Promise.all([
      Encounter.findOne({
        _id: req.params.encounterId,
        user: req.user._id,
      }),
      Character.findOne({
        _id: characterId,
        user: req.user._id,
      }),
    ]);

    if (!encounter) {
      return res.status(404).json({ message: "Encounter not found" });
    }

    if (!character) {
      return res.status(404).json({ message: "Character not found" });
    }

    encounter.entries.push(
      buildEntrySnapshot({
        characterId: character._id,
        name: character.name,
        type: character.type,
        maxHp: character.maxHp,
        currentHp: character.maxHp,
        armorClass: character.armorClass,
        initiativeBonus: character.initiativeBonus,
        stats: character.stats,
        consumables: character.consumables,
        notes: character.notes,
      })
    );
    await encounter.save();

    res.status(201).json({ entry: encounter.entries.at(-1), encounter });
  } catch (error) {
    console.log("Error in add character entry route", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/custom", validateEncounterId, async (req, res) => {
  try {
    const { name, type, maxHp } = req.body;

    if (!name || !type || maxHp === undefined || maxHp === null) {
      return res.status(400).json({ message: "name, type, and maxHp are required" });
    }

    const encounter = await Encounter.findOne({
      _id: req.params.encounterId,
      user: req.user._id,
    });

    if (!encounter) {
      return res.status(404).json({ message: "Encounter not found" });
    }

    encounter.entries.push(buildEntrySnapshot(req.body));
    await encounter.save();

    res.status(201).json({ entry: encounter.entries.at(-1), encounter });
  } catch (error) {
    console.log("Error in add custom entry route", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal server error" });
  }
});


router.post("/:entryId/damage", validateEncounterId, validateEntryId, async (req, res) => {
  try {
    const amount = getPositiveAmount(req.body.amount);

    if (!amount) {
      return res.status(400).json({ message: "amount must be a positive number" });
    }

    const result = await findEntryOrRespond(req, res);
    if (!result) return;

    const { encounter, entry } = result;
    const currentTempHp = entry.tempHp ?? 0;
    const absorbedByTempHp = Math.min(currentTempHp, amount);
    const remainingDamage = amount - absorbedByTempHp;

    entry.tempHp = currentTempHp - absorbedByTempHp;
    entry.currentHp = Math.max(entry.currentHp - remainingDamage, 0);

    if (entry.currentHp === 0) {
      entry.status = "down";
    }

    await encounter.save();

    res.status(200).json({ entry, encounter });
  } catch (error) {
    console.log("Error in damage entry route", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/:entryId/heal", validateEncounterId, validateEntryId, async (req, res) => {
  try {
    const amount = getPositiveAmount(req.body.amount);

    if (!amount) {
      return res.status(400).json({ message: "amount must be a positive number" });
    }

    const result = await findEntryOrRespond(req, res);
    if (!result) return;

    const { encounter, entry } = result;

    entry.currentHp = Math.min(entry.currentHp + amount, entry.maxHp);

    if (entry.currentHp > 0 && entry.status === "down") {
      entry.status = "active";
    }

    await encounter.save();

    res.status(200).json({ entry, encounter });
  } catch (error) {
    console.log("Error in heal entry route", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/:entryId/temp-hp", validateEncounterId, validateEntryId, async (req, res) => {
  try {
    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount < 0) {
      return res.status(400).json({ message: "amount must be a non-negative number" });
    }

    const result = await findEntryOrRespond(req, res);
    if (!result) return;

    const { encounter, entry } = result;

    entry.tempHp = amount;
    await encounter.save();

    res.status(200).json({ entry, encounter });
  } catch (error) {
    console.log("Error in temp hp entry route", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/:entryId/conditions", validateEncounterId, validateEntryId, async (req, res) => {
  try {
    const condition = normalizeCondition(req.body.condition);

    if (!condition) {
      return res.status(400).json({ message: "condition is required" });
    }

    const result = await findEntryOrRespond(req, res);
    if (!result) return;

    const { encounter, entry } = result;

    if (!entry.conditions.includes(condition)) {
      entry.conditions.push(condition);
    }

    await encounter.save();

    res.status(200).json({ entry, encounter });
  } catch (error) {
    console.log("Error in add condition route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/:entryId/conditions/:condition", validateEncounterId, validateEntryId, async (req, res) => {
  try {
    const condition = normalizeCondition(req.params.condition);

    if (!condition) {
      return res.status(400).json({ message: "condition is required" });
    }

    const result = await findEntryOrRespond(req, res);
    if (!result) return;

    const { encounter, entry } = result;

    entry.conditions = entry.conditions.filter((entryCondition) => normalizeCondition(entryCondition) !== condition);
    await encounter.save();

    res.status(200).json({ entry, encounter });
  } catch (error) {
    console.log("Error in remove condition route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


router.post("/:entryId/consumables", validateEncounterId, validateEntryId, async (req, res) => {
  try {
    const { name, maxUses, currentUses, resetOn, notes } = req.body;

    if (!name || maxUses === undefined || maxUses === null || currentUses === undefined || currentUses === null) {
      return res.status(400).json({ message: "name, maxUses, and currentUses are required" });
    }

    const parsedMaxUses = getNonNegativeAmount(maxUses);
    const parsedCurrentUses = getNonNegativeAmount(currentUses);

    if (parsedMaxUses === null || parsedCurrentUses === null) {
      return res.status(400).json({ message: "maxUses and currentUses must be non-negative numbers" });
    }

    if (parsedCurrentUses > parsedMaxUses) {
      return res.status(400).json({
        message: "currentUses cannot exceed maxUses",
      });
    }

    const result = await findEntryOrRespond(req, res);
    if (!result) return;

    const { encounter, entry } = result;

    entry.consumables.push({
      name,
      maxUses: parsedMaxUses,
      currentUses: parsedCurrentUses,
      resetOn,
      notes,
    });
    await encounter.save();

    res.status(201).json({ consumable: entry.consumables.at(-1), entry, encounter });
  } catch (error) {
    console.log("Error in add consumable route", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal server error" });
  }
});

router.post(
  "/:entryId/consumables/:consumableId/use",
  validateEncounterId,
  validateEntryId,
  validateConsumableId,
  async (req, res) => {
    try {
      const result = await findConsumableOrRespond(req, res);
      if (!result) return;

      const { encounter, entry, consumable } = result;

      if (consumable.currentUses <= 0) {
        return res.status(400).json({ message: "Consumable has no uses remaining" });
      }

      consumable.currentUses -= 1;
      await encounter.save();

      res.status(200).json({ consumable, entry, encounter });
    } catch (error) {
      console.log("Error in use consumable route", error);

      if (error.name === "ValidationError") {
        return res.status(400).json({ message: error.message });
      }

      res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.patch(
  "/:entryId/consumables/:consumableId",
  validateEncounterId,
  validateEntryId,
  validateConsumableId,
  async (req, res) => {
    try {
      const updates = pickAllowedFields(req.body, allowedConsumableUpdateFields);

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid consumable fields provided" });
      }

      const result = await findConsumableOrRespond(req, res);
      if (!result) return;

      const { encounter, entry, consumable } = result;

      consumable.set(updates);
      await encounter.save();

      res.status(200).json({ consumable, entry, encounter });
    } catch (error) {
      console.log("Error in update consumable route", error);

      if (error.name === "ValidationError") {
        return res.status(400).json({ message: error.message });
      }

      res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.delete(
  "/:entryId/consumables/:consumableId",
  validateEncounterId,
  validateEntryId,
  validateConsumableId,
  async (req, res) => {
    try {
      const result = await findConsumableOrRespond(req, res);
      if (!result) return;

      const { encounter, entry, consumable } = result;

      consumable.deleteOne();
      await encounter.save();

      res.status(200).json({ message: "Consumable removed", entry, encounter });
    } catch (error) {
      console.log("Error in remove consumable route", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.patch("/:entryId", validateEncounterId, validateEntryId, async (req, res) => {
  try {
    const updates = pickAllowedFields(req.body);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid entry fields provided" });
    }

    const { encounter, entry } = await findEncounterEntry(
      req.params.encounterId,
      req.params.entryId,
      req.user._id
    );

    if (!encounter) {
      return res.status(404).json({ message: "Encounter not found" });
    }

    if (!entry) {
      return res.status(404).json({ message: "Entry not found" });
    }

    entry.set(updates);

    if ("initiativeRoll" in updates || "initiativeBonus" in updates) {
      recalculateInitiativeTotal(entry);
    }

    await encounter.save();

    res.status(200).json({ entry, encounter });
  } catch (error) {
    console.log("Error in update entry route", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/:entryId", validateEncounterId, validateEntryId, async (req, res) => {
  try {
    const { encounter, entry } = await findEncounterEntry(
      req.params.encounterId,
      req.params.entryId,
      req.user._id
    );

    if (!encounter) {
      return res.status(404).json({ message: "Encounter not found" });
    }

    if (!entry) {
      return res.status(404).json({ message: "Entry not found" });
    }

    entry.status = "removed";
    await encounter.save();

    res.status(200).json({ message: "Entry removed", entry, encounter });
  } catch (error) {
    console.log("Error in remove entry route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
