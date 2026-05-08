import mongoose from "mongoose";
import Campaign from "../models/Campaign.js";
import Encounter from "../models/Encounter.js";
import {
  advanceTurn,
  buildTurnResponse,
  getManualInitiativesByEntryId,
  getProvidedInitiativeRolls,
  getTurnEntryIndexes,
  reverseTurn,
  rollInitiative as rollEncounterInitiative,
  setCurrentTurn,
  startEncounter as startEncounterTurnOrder,
} from "../services/initiativeService.js";
import { addDefaultPartyEntries } from "../services/encounterEntryService.js";
import { pickAllowedFields } from "../utils/pickAllowedFields.js";

const allowedEncounterUpdateFields = ["name", "status", "notes"];

const buildEncounterFilters = (query) => {
  const filters = {};

  if (query.status) {
    filters.status = query.status.toLowerCase();
  }

  if (query.campaignId) {
    filters.campaign = query.campaignId;
  }

  return filters;
};

const findUserEncounter = (encounterId, userId) => {
  return Encounter.findOne({
    _id: encounterId,
    user: userId,
  });
};

const validateOptionalCampaignQuery = (req, res) => {
  if (req.query.campaignId && !mongoose.isValidObjectId(req.query.campaignId)) {
    res.status(400).json({ message: "Invalid campaign id" });
    return false;
  }

  return true;
};

const findOwnedCampaign = async (campaignId, userId) => {
  if (!mongoose.isValidObjectId(campaignId)) {
    return null;
  }

  return Campaign.findOne({
    _id: campaignId,
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
  if (!validateOptionalCampaignQuery(req, res)) return;

  const encounters = await Encounter.find({
    user: req.user._id,
    ...buildEncounterFilters(req.query),
  }).sort({ createdAt: -1 });

  res.status(200).json(encounters);
};

export const createEncounter = async (req, res) => {
  const { campaignId, name, notes, autoAddParty } = req.body;

  if (!campaignId || !name) {
    return res.status(400).json({ message: "campaignId and name are required" });
  }

  const campaign = await findOwnedCampaign(campaignId, req.user._id);

  if (!campaign) {
    return res.status(404).json({ message: "Campaign not found" });
  }

  const encounter = new Encounter({
    user: req.user._id,
    campaign: campaign._id,
    name,
    notes,
  });

  if (autoAddParty === true) {
    await addDefaultPartyEntries({ encounter, campaign, userId: req.user._id });
  }

  await encounter.save();

  return res.status(201).json(encounter);
};

export const addPartyEntries = async (req, res) => {
  const encounter = await findEncounterOrRespond(req, res);
  if (!encounter) return;

  const campaign = await findOwnedCampaign(encounter.campaign, req.user._id);

  if (!campaign) {
    return res.status(404).json({ message: "Campaign not found" });
  }

  const entries = await addDefaultPartyEntries({ encounter, campaign, userId: req.user._id });
  await encounter.save();

  return res.status(201).json({ entries, encounter });
};

export const rollInitiative = async (req, res) => {
  const encounter = await findEncounterOrRespond(req, res);
  if (!encounter) return;

  const turnEntryIndexes = getRequiredTurnEntryIndexes(encounter, res);
  if (!turnEntryIndexes) return;

  const { manualInitiativesByEntryId, error } = getManualInitiativesByEntryId(
    req.body?.manualInitiatives,
  );

  if (error) {
    return res.status(400).json({ message: error });
  }

  const validEntryIds = new Set(encounter.entries.map((entry) => entry._id.toString()));

  for (const entryId of manualInitiativesByEntryId.keys()) {
    if (!validEntryIds.has(entryId)) {
      return res.status(400).json({
        message: "manualInitiatives contains an unknown entryId",
      });
    }
  }

  const rollsByEntryId = getProvidedInitiativeRolls(req.body?.rollsByEntryId);
  const rollMissing = req.body?.rollMissing !== false;
  const rerollExisting = req.body?.rerollExisting === true;

  if (
    !rollEncounterInitiative(encounter, {
      manualInitiativesByEntryId,
      rollMissing,
      rerollExisting,
      rollsByEntryId,
    })
  ) {
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
