import mongoose from "mongoose";
import Encounter from "../../models/Encounter.js";

export const allowedInitiativeModes = new Set(["roll", "auto", "manual"]);

export const allowedEntryUpdateFields = [
  "name",
  "type",
  "disposition",
  "maxHp",
  "currentHp",
  "tempHp",
  "armorClass",
  "initiativeBonus",
  "initiativeRoll",
  "initiativeTotal",
  "stats",
  "consumables",
  "conditions",
  "status",
  "notes",
];

export const allowedConsumableUpdateFields = ["name", "maxUses", "currentUses", "resetOn", "notes"];

export const rejectCompletedEncounterMutation = (encounter, res) => {
  if (encounter.status !== "completed") return false;
  res.status(400).json({ message: "Completed encounters are read-only" });
  return true;
};

export const validateInitiativeMode = (initiativeMode, res) => {
  if (initiativeMode === undefined || initiativeMode === null) return true;
  if (allowedInitiativeModes.has(initiativeMode)) return true;
  res.status(400).json({ message: "initiativeMode must be one of: roll, auto, manual" });
  return false;
};

export const findEncounterEntry = async (encounterId, entryId, userId) => {
  const encounter = await Encounter.findOne({ _id: encounterId, user: userId });
  if (!encounter) return { encounter: null, entry: null };
  return { encounter, entry: encounter.entries.id(entryId) };
};

export const findEntryOrRespond = async (req, res) => {
  const { encounter, entry } = await findEncounterEntry(req.params.encounterId, req.params.entryId, req.user._id);
  if (!encounter) {
    res.status(404).json({ message: "Encounter not found" });
    return null;
  }
  if (rejectCompletedEncounterMutation(encounter, res)) return null;
  if (!entry) {
    res.status(404).json({ message: "Entry not found" });
    return null;
  }
  return { encounter, entry };
};

export const requireEntryIds = (entryIds, res) => {
  if (!Array.isArray(entryIds) || entryIds.length === 0) {
    res.status(400).json({ message: "entryIds must be a non-empty array" });
    return null;
  }
  if (entryIds.some((entryId) => !mongoose.isValidObjectId(entryId))) {
    res.status(400).json({ message: "Invalid entry id" });
    return null;
  }
  return [...new Set(entryIds.map((entryId) => entryId.toString()))];
};

export const findEntriesOrRespond = async (req, res, entryIds) => {
  const encounter = await Encounter.findOne({ _id: req.params.encounterId, user: req.user._id });
  if (!encounter) {
    res.status(404).json({ message: "Encounter not found" });
    return null;
  }
  if (rejectCompletedEncounterMutation(encounter, res)) return null;
  const entries = entryIds.map((entryId) => encounter.entries.id(entryId));
  if (entries.some((entry) => !entry)) {
    res.status(404).json({ message: "One or more entries were not found" });
    return null;
  }
  return { encounter, entries };
};

export const findConsumableOrRespond = async (req, res) => {
  const result = await findEntryOrRespond(req, res);
  if (!result) return null;
  const consumable = result.entry.consumables.id(req.params.consumableId);
  if (!consumable) {
    res.status(404).json({ message: "Consumable not found" });
    return null;
  }
  return { ...result, consumable };
};
