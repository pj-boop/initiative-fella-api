import { useConsumable } from "../../services/consumableService.js";
import { parseNonNegativeInt } from "../../utils/numbers.js";
import { pickAllowedFields } from "../../utils/pickAllowedFields.js";
import {
  allowedConsumableUpdateFields,
  findConsumableOrRespond,
  findEntryOrRespond,
} from "./shared.js";

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
  if (parsedCurrentUses > parsedMaxUses) return res.status(400).json({ message: "currentUses cannot exceed maxUses" });

  const result = await findEntryOrRespond(req, res);
  if (!result) return;
  const { encounter, entry } = result;

  entry.consumables.push({ name, maxUses: parsedMaxUses, currentUses: parsedCurrentUses, resetOn, notes });
  await encounter.save();
  return res.status(201).json({ consumable: entry.consumables.at(-1), entry, encounter });
};

export const useEntryConsumable = async (req, res) => {
  const result = await findConsumableOrRespond(req, res);
  if (!result) return;
  const { encounter, entry, consumable } = result;

  if (!useConsumable(consumable)) return res.status(400).json({ message: "Consumable has no uses remaining" });
  await encounter.save();
  return res.status(200).json({ consumable, entry, encounter });
};

export const updateConsumable = async (req, res) => {
  const updates = pickAllowedFields(req.body, allowedConsumableUpdateFields);
  if (Object.keys(updates).length === 0) return res.status(400).json({ message: "No valid consumable fields provided" });

  const result = await findConsumableOrRespond(req, res);
  if (!result) return;
  const { encounter, entry, consumable } = result;

  consumable.set(updates);
  if (consumable.currentUses > consumable.maxUses) return res.status(400).json({ message: "currentUses cannot exceed maxUses" });

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
