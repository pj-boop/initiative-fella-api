import mongoose from "mongoose";
import Character from "../../models/Character.js";
import Encounter from "../../models/Encounter.js";
import {
  buildEntrySnapshot,
  buildEntryFromCharacter,
  normalizeInitiativeFields,
} from "../../services/encounterEntryService.js";
import { pickAllowedFields } from "../../utils/pickAllowedFields.js";
import {
  allowedEntryUpdateFields,
  findEntryOrRespond,
  rejectCompletedEncounterMutation,
  validateInitiativeMode,
} from "./shared.js";

export const addFromCharacter = async (req, res) => {
  const { characterId, initiativeMode } = req.body;
  if (!validateInitiativeMode(initiativeMode, res)) return;
  if (!characterId) return res.status(400).json({ message: "characterId is required" });
  if (!mongoose.isValidObjectId(characterId)) return res.status(400).json({ message: "Invalid character id" });

  const encounter = await Encounter.findOne({ _id: req.params.encounterId, user: req.user._id });
  if (!encounter) return res.status(404).json({ message: "Encounter not found" });
  if (rejectCompletedEncounterMutation(encounter, res)) return;

  const character = await Character.findOne({ _id: characterId, user: req.user._id, campaign: encounter.campaign });
  if (!character) return res.status(404).json({ message: "Character not found" });

  if (character.type === "player" && encounter.entries.some((entry) => entry.characterId?.toString() === character._id.toString())) {
    return res.status(400).json({ message: "Player character is already in this encounter" });
  }

  encounter.entries.push(buildEntryFromCharacter(character, { initiativeMode }));
  await encounter.save();
  return res.status(201).json({ entry: encounter.entries.at(-1), encounter });
};

export const addCustomEntry = async (req, res) => {
  const { name, type, maxHp, initiativeMode } = req.body;
  if (!validateInitiativeMode(initiativeMode, res)) return;
  if (!name || !type || maxHp === undefined || maxHp === null) {
    return res.status(400).json({ message: "name, type, and maxHp are required" });
  }

  const encounter = await Encounter.findOne({ _id: req.params.encounterId, user: req.user._id });
  if (!encounter) return res.status(404).json({ message: "Encounter not found" });
  if (rejectCompletedEncounterMutation(encounter, res)) return;

  encounter.entries.push(buildEntrySnapshot(req.body));
  await encounter.save();
  return res.status(201).json({ entry: encounter.entries.at(-1), encounter });
};

export const updateEntry = async (req, res) => {
  const updates = pickAllowedFields(req.body, allowedEntryUpdateFields);
  if (Object.keys(updates).length === 0) return res.status(400).json({ message: "No valid entry fields provided" });

  const result = await findEntryOrRespond(req, res);
  if (!result) return;
  const { encounter, entry } = result;

  entry.set(updates);
  if (entry.currentHp > entry.maxHp) return res.status(400).json({ message: "currentHp cannot exceed maxHp" });

  if ("initiativeRoll" in updates || "initiativeTotal" in updates || "initiativeBonus" in updates) {
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
