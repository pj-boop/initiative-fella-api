import mongoose from "mongoose";
import Encounter from "../models/Encounter.js";
import {
  advanceTurn,
  buildTurnResponse,
  getProvidedInitiativeRolls,
  getTurnEntryIndexes,
  reverseTurn,
  rollInitiative as rollEncounterInitiative,
  setCurrentTurn,
  startEncounter as startEncounterTurnOrder,
} from "../services/initiativeService.js";
import { pickAllowedFields } from "../utils/pickAllowedFields.js";

const allowedEncounterUpdateFields = ["name", "status", "notes"];

const buildEncounterFilters = (query) => {
  const filters = {};

  if (query.status) {
    filters.status = query.status.toLowerCase();
  }

  return filters;
};

const findUserEncounter = (encounterId, userId) => {
  return Encounter.findOne({
    _id: encounterId,
    user: userId,
  });
};

const getRequiredTurnEntryIndexes = (encounter, res) => {
  const turnEntryIndexes = getTurnEntryIndexes(encounter);

  if (turnEntryIndexes.length === 0) {
    res.status(400).json({ message: "Encounter must have at least one turn-eligible entry" });
    return null;
  }

  return turnEntryIndexes;
};

const findEncounterOrRespond = async (req, res) => {
  const encounter = await findUserEncounter(req.params.encounterId, req.user._id);

  if (!encounter) {
    res.status(404).json({ message: "Encounter not found" });
    return null;
  }

  return encounter;
};

export const getEncounters = async (req, res) => {
  const encounters = await Encounter.find({
    user: req.user._id,
    ...buildEncounterFilters(req.query),
  }).sort({ createdAt: -1 });

  res.status(200).json(encounters);
};

export const createEncounter = async (req, res) => {
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

  return res.status(201).json(encounter);
};

export const rollInitiative = async (req, res) => {
  const encounter = await findEncounterOrRespond(req, res);
  if (!encounter) return;

  const turnEntryIndexes = getRequiredTurnEntryIndexes(encounter, res);
  if (!turnEntryIndexes) return;

  const rollsByEntryId = getProvidedInitiativeRolls(req.body?.rollsByEntryId);

  if (!rollEncounterInitiative(encounter, rollsByEntryId)) {
    return res.status(400).json({ message: "initiative rolls must be integers from 1 to 20" });
  }

  await encounter.save();

  return res.status(200).json(buildTurnResponse(encounter));
};

export const startEncounter = async (req, res) => {
  const encounter = await findEncounterOrRespond(req, res);
  if (!encounter) return;

  const turnEntryIndexes = getRequiredTurnEntryIndexes(encounter, res);
  if (!turnEntryIndexes) return;

  startEncounterTurnOrder(encounter, turnEntryIndexes);
  await encounter.save();

  return res.status(200).json(buildTurnResponse(encounter));
};

export const nextTurn = async (req, res) => {
  const encounter = await findEncounterOrRespond(req, res);
  if (!encounter) return;

  const turnEntryIndexes = getRequiredTurnEntryIndexes(encounter, res);
  if (!turnEntryIndexes) return;

  advanceTurn(encounter, turnEntryIndexes);
  await encounter.save();

  return res.status(200).json(buildTurnResponse(encounter));
};

export const previousTurn = async (req, res) => {
  const encounter = await findEncounterOrRespond(req, res);
  if (!encounter) return;

  const turnEntryIndexes = getRequiredTurnEntryIndexes(encounter, res);
  if (!turnEntryIndexes) return;

  reverseTurn(encounter, turnEntryIndexes);
  await encounter.save();

  return res.status(200).json(buildTurnResponse(encounter));
};

export const updateCurrentTurn = async (req, res) => {
  const { currentTurnIndex, entryId, round } = req.body ?? {};

  if (currentTurnIndex === undefined && entryId === undefined && round === undefined) {
    return res.status(400).json({ message: "currentTurnIndex, entryId, or round is required" });
  }

  if (currentTurnIndex !== undefined && entryId !== undefined) {
    return res.status(400).json({ message: "Provide either currentTurnIndex or entryId, not both" });
  }

  if (entryId !== undefined && !mongoose.isValidObjectId(entryId)) {
    return res.status(400).json({ message: "Invalid entry id" });
  }

  const encounter = await findEncounterOrRespond(req, res);
  if (!encounter) return;

  const turnEntryIndexes = getRequiredTurnEntryIndexes(encounter, res);
  if (!turnEntryIndexes) return;

  const result = setCurrentTurn(encounter, { currentTurnIndex, entryId, round }, turnEntryIndexes);

  if (result.error) {
    return res.status(result.status ?? 400).json({ message: result.error });
  }

  await encounter.save();

  return res.status(200).json(buildTurnResponse(encounter));
};

export const endEncounter = async (req, res) => {
  const encounter = await findEncounterOrRespond(req, res);
  if (!encounter) return;

  encounter.status = "completed";
  await encounter.save();

  return res.status(200).json(buildTurnResponse(encounter));
};

export const getEncounter = async (req, res) => {
  const encounter = await findEncounterOrRespond(req, res);
  if (!encounter) return;

  return res.status(200).json(encounter);
};

export const updateEncounter = async (req, res) => {
  const updates = pickAllowedFields(req.body, allowedEncounterUpdateFields);

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: "No valid encounter fields provided" });
  }

  const encounter = await Encounter.findOneAndUpdate(
    {
      _id: req.params.encounterId,
      user: req.user._id,
    },
    updates,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!encounter) {
    return res.status(404).json({ message: "Encounter not found" });
  }

  return res.status(200).json(encounter);
};

export const deleteEncounter = async (req, res) => {
  const encounter = await Encounter.findOneAndDelete({
    _id: req.params.encounterId,
    user: req.user._id,
  });

  if (!encounter) {
    return res.status(404).json({ message: "Encounter not found" });
  }

  return res.status(200).json({ message: "Encounter deleted", encounter });
};
