import { applyDamage, applyHealing, setTempHp } from "../../services/combatService.js";
import { parseNonNegativeInt, parsePositiveInt } from "../../utils/numbers.js";
import { findEntryOrRespond } from "./shared.js";

export const damageEntry = async (req, res) => {
  const amount = parsePositiveInt(req.body.amount);
  if (!amount) return res.status(400).json({ message: "amount must be a positive integer" });
  const result = await findEntryOrRespond(req, res);
  if (!result) return;
  const { encounter, entry } = result;
  applyDamage(entry, amount);
  await encounter.save();
  return res.status(200).json({ entry, encounter });
};

export const healEntry = async (req, res) => {
  const amount = parsePositiveInt(req.body.amount);
  if (!amount) return res.status(400).json({ message: "amount must be a positive integer" });
  const result = await findEntryOrRespond(req, res);
  if (!result) return;
  const { encounter, entry } = result;
  applyHealing(entry, amount);
  await encounter.save();
  return res.status(200).json({ entry, encounter });
};

export const updateTempHp = async (req, res) => {
  const amount = parseNonNegativeInt(req.body.amount);
  if (amount === null) return res.status(400).json({ message: "amount must be a non-negative integer" });
  const result = await findEntryOrRespond(req, res);
  if (!result) return;
  const { encounter, entry } = result;
  setTempHp(entry, amount);
  await encounter.save();
  return res.status(200).json({ entry, encounter });
};
