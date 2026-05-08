import mongoose from "mongoose";
import Character from "../models/Character.js";
import Encounter from "../models/Encounter.js";
import {
  addCondition,
  applyDamage,
  applyHealing,
  normalizeCondition,
  removeCondition,
  setTempHp,
} from "../services/combatService.js";
import { useConsumable } from "../services/consumableService.js";
import {
  buildEntrySnapshot,
  buildEntryFromCharacter,
  normalizeInitiativeFields,
} from "../services/encounterEntryService.js";
import { parseNonNegativeInt, parsePositiveInt } from "../utils/numbers.js";
import { pickAllowedFields } from "../utils/pickAllowedFields.js";

const allowedEntryUpdateFields = [
  "name",
  "type",
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

const allowedConsumableUpdateFields = ["name", "maxUses", "currentUses", "resetOn", "notes"];

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

export const addFromCharacter = async (req, res) => {
  const { characterId } = req.body;

  if (!characterId) {
    return res.status(400).json({ message: "characterId is required" });
  }

  if (!mongoose.isValidObjectId(characterId)) {
    return res.status(400).json({ message: "Invalid character id" });
  }

  const encounter = await Encounter.findOne({
    _id: req.params.encounterId,
    user: req.user._id,
  });

  if (!encounter) {
    return res.status(404).json({ message: "Encounter not found" });
  }

  const character = await Character.findOne({
    _id: characterId,
    user: req.user._id,
    campaign: encounter.campaign,
  });

  if (!character) {
    return res.status(404).json({ message: "Character not found" });
  }

  encounter.entries.push(buildEntryFromCharacter(character));
  await encounter.save();

  return res.status(201).json({ entry: encounter.entries.at(-1), encounter });
};

export const addCustomEntry = async (req, res) => {
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

  return res.status(201).json({ entry: encounter.entries.at(-1), encounter });
};

export const damageEntry = async (req, res) => {
  const amount = parsePositiveInt(req.body.amount);

  if (!amount) {
    return res.status(400).json({ message: "amount must be a positive integer" });
  }

  const result = await findEntryOrRespond(req, res);
  if (!result) return;

  const { encounter, entry } = result;
  applyDamage(entry, amount);

  await encounter.save();

  return res.status(200).json({ entry, encounter });
};

export const healEntry = async (req, res) => {
  const amount = parsePositiveInt(req.body.amount);

  if (!amount) {
    return res.status(400).json({ message: "amount must be a positive integer" });
  }

  const result = await findEntryOrRespond(req, res);
  if (!result) return;

  const { encounter, entry } = result;
  applyHealing(entry, amount);

  await encounter.save();

  return res.status(200).json({ entry, encounter });
};

export const updateTempHp = async (req, res) => {
  const amount = parseNonNegativeInt(req.body.amount);

  if (amount === null) {
    return res.status(400).json({ message: "amount must be a non-negative integer" });
  }

  const result = await findEntryOrRespond(req, res);
  if (!result) return;

  const { encounter, entry } = result;
  setTempHp(entry, amount);

  await encounter.save();

  return res.status(200).json({ entry, encounter });
};

export const addEntryCondition = async (req, res) => {
  const condition = normalizeCondition(req.body.condition);

  if (!condition) {
    return res.status(400).json({ message: "condition is required" });
  }

  const result = await findEntryOrRespond(req, res);
  if (!result) return;

  const { encounter, entry } = result;
  addCondition(entry, condition);

  await encounter.save();

  return res.status(200).json({ entry, encounter });
};

export const removeEntryCondition = async (req, res) => {
  const condition = normalizeCondition(req.params.condition);

  if (!condition) {
    return res.status(400).json({ message: "condition is required" });
  }

  const result = await findEntryOrRespond(req, res);
  if (!result) return;

  const { encounter, entry } = result;
  removeCondition(entry, condition);

  await encounter.save();

  return res.status(200).json({ entry, encounter });
};

export const addConsumable = async (req, res) => {
  const { name, maxUses, currentUses, resetOn, notes } = req.body;

  if (!name || maxUses === undefined || maxUses === null || currentUses === undefined || currentUses === null) {
    return res.status(400).json({ message: "name, maxUses, and currentUses are required" });
  }

  const parsedMaxUses = parseNonNegativeInt(maxUses);
  const parsedCurrentUses = parseNonNegativeInt(currentUses);

  if (parsedMaxUses === null || parsedCurrentUses === null) {
    return res.status(400).json({ message: "maxUses and currentUses must be non-negative integers" });
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

  return res.status(201).json({ consumable: entry.consumables.at(-1), entry, encounter });
};

export const useEntryConsumable = async (req, res) => {
  const result = await findConsumableOrRespond(req, res);
  if (!result) return;

  const { encounter, entry, consumable } = result;

  if (!useConsumable(consumable)) {
    return res.status(400).json({ message: "Consumable has no uses remaining" });
  }

  await encounter.save();

  return res.status(200).json({ consumable, entry, encounter });
};

export const updateConsumable = async (req, res) => {
  const updates = pickAllowedFields(req.body, allowedConsumableUpdateFields);

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: "No valid consumable fields provided" });
  }

  const result = await findConsumableOrRespond(req, res);
  if (!result) return;

  const { encounter, entry, consumable } = result;

  consumable.set(updates);

  if (consumable.currentUses > consumable.maxUses) {
    return res.status(400).json({
      message: "currentUses cannot exceed maxUses",
    });
  }

  await encounter.save();

  return res.status(200).json({ consumable, entry, encounter });
};

export const removeConsumable = async (req, res) => {
  const result = await findConsumableOrRespond(req, res);
  if (!result) return;

  const { encounter, entry, consumable } = result;

  consumable.deleteOne();
  await encounter.save();

  return res.status(200).json({ message: "Consumable removed", entry, encounter });
};

export const updateEntry = async (req, res) => {
  const updates = pickAllowedFields(req.body, allowedEntryUpdateFields);

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: "No valid entry fields provided" });
  }

  const result = await findEntryOrRespond(req, res);
  if (!result) return;

  const { encounter, entry } = result;

  entry.set(updates);

  if (entry.currentHp > entry.maxHp) {
    return res.status(400).json({
      message: "currentHp cannot exceed maxHp",
    });
  }

  if (
    "initiativeRoll" in updates ||
    "initiativeTotal" in updates ||
    "initiativeBonus" in updates
  ) {
    normalizeInitiativeFields(entry, {
      initiativeRollProvided: "initiativeRoll" in updates,
      initiativeTotalProvided: "initiativeTotal" in updates,
    });
  }

  await encounter.save();

  return res.status(200).json({ entry, encounter });
};

export const removeEntry = async (req, res) => {
  const result = await findEntryOrRespond(req, res);
  if (!result) return;

  const { encounter, entry } = result;

  entry.status = "removed";
  await encounter.save();

  return res.status(200).json({ message: "Entry removed", entry, encounter });
};
