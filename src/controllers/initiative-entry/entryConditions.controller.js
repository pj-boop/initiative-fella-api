import { addCondition, normalizeCondition, removeCondition } from "../../services/combatService.js";
import { findEntryOrRespond } from "./shared.js";

export const addEntryCondition = async (req, res) => {
  const condition = normalizeCondition(req.body.condition);
  if (!condition) return res.status(400).json({ message: "condition is required" });
  const result = await findEntryOrRespond(req, res);
  if (!result) return;
  const { encounter, entry } = result;
  addCondition(entry, condition);
  await encounter.save();
  return res.status(200).json({ entry, encounter });
};

export const removeEntryCondition = async (req, res) => {
  const condition = normalizeCondition(req.params.condition);
  if (!condition) return res.status(400).json({ message: "condition is required" });
  const result = await findEntryOrRespond(req, res);
  if (!result) return;
  const { encounter, entry } = result;
  removeCondition(entry, condition);
  await encounter.save();
  return res.status(200).json({ entry, encounter });
};
