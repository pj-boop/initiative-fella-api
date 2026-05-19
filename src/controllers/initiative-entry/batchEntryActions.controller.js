import {
  addCondition,
  applyDamage,
  applyHealing,
  normalizeCondition,
  removeCondition,
  setTempHp,
} from "../../services/combatService.js";
import { parseNonNegativeInt, parsePositiveInt } from "../../utils/numbers.js";
import { findEntriesOrRespond, requireEntryIds } from "./shared.js";

export const batchDamageEntries = async (req, res) => {
  const entryIds = requireEntryIds(req.body.entryIds, res);
  if (!entryIds) return;
  const amount = parsePositiveInt(req.body.amount);
  if (!amount) return res.status(400).json({ message: "amount must be a positive integer" });

  const result = await findEntriesOrRespond(req, res, entryIds);
  if (!result) return;
  const { encounter, entries } = result;
  entries.forEach((entry) => applyDamage(entry, amount));
  await encounter.save();
  return res.status(200).json({ entries, encounter });
};

export const batchHealEntries = async (req, res) => {
  const entryIds = requireEntryIds(req.body.entryIds, res);
  if (!entryIds) return;
  const amount = parsePositiveInt(req.body.amount);
  if (!amount) return res.status(400).json({ message: "amount must be a positive integer" });

  const result = await findEntriesOrRespond(req, res, entryIds);
  if (!result) return;
  const { encounter, entries } = result;
  entries.forEach((entry) => applyHealing(entry, amount));
  await encounter.save();
  return res.status(200).json({ entries, encounter });
};

export const batchUpdateTempHpEntries = async (req, res) => {
  const entryIds = requireEntryIds(req.body.entryIds, res);
  if (!entryIds) return;
  const amount = parseNonNegativeInt(req.body.amount);
  if (amount === null) return res.status(400).json({ message: "amount must be a non-negative integer" });

  const result = await findEntriesOrRespond(req, res, entryIds);
  if (!result) return;
  const { encounter, entries } = result;
  entries.forEach((entry) => setTempHp(entry, amount));
  await encounter.save();
  return res.status(200).json({ entries, encounter });
};

export const batchUpdateEntryConditions = async (req, res) => {
  const entryIds = requireEntryIds(req.body.entryIds, res);
  if (!entryIds) return;
  const condition = normalizeCondition(req.body.condition);
  const action = (req.body.action ?? "add").toLowerCase();

  if (!condition) return res.status(400).json({ message: "condition is required" });
  if (!["add", "remove"].includes(action)) {
    return res.status(400).json({ message: "action must be one of: add, remove" });
  }

  const result = await findEntriesOrRespond(req, res, entryIds);
  if (!result) return;

  const { encounter, entries } = result;
  entries.forEach((entry) => (action === "add" ? addCondition(entry, condition) : removeCondition(entry, condition)));
  await encounter.save();
  return res.status(200).json({ entries, encounter });
};
