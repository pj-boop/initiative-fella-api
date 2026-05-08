import mongoose from "mongoose";
import Campaign from "../models/Campaign.js";
import Character from "../models/Character.js";
import { pickAllowedFields } from "../utils/pickAllowedFields.js";

const allowedUpdateFields = [
  "name",
  "type",
  "maxHp",
  "armorClass",
  "initiativeBonus",
  "stats",
  "consumables",
  "notes",
];

const buildCharacterFilters = (query) => {
  const filters = {};

  if (query.type) {
    filters.type = query.type.toLowerCase();
  }

  if (query.campaignId) {
    filters.campaign = query.campaignId;
  }

  return filters;
};

const buildCharacterLookup = (req) => {
  const lookup = {
    _id: req.params.characterId,
    user: req.user._id,
  };

  if (req.query.campaignId) {
    lookup.campaign = req.query.campaignId;
  }

  return lookup;
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

export const getCharacters = async (req, res) => {
  if (!validateOptionalCampaignQuery(req, res)) return;

  const characters = await Character.find({
    user: req.user._id,
    ...buildCharacterFilters(req.query),
  }).sort({ createdAt: -1 });

  res.status(200).json(characters);
};

export const createCharacter = async (req, res) => {
  const { campaignId, name, type, maxHp, armorClass, initiativeBonus, stats, consumables, notes } = req.body;

  if (!campaignId || !name || !type || maxHp === undefined || maxHp === null) {
    return res.status(400).json({ message: "campaignId, name, type, and maxHp are required" });
  }

  const campaign = await findOwnedCampaign(campaignId, req.user._id);

  if (!campaign) {
    return res.status(404).json({ message: "Campaign not found" });
  }

  const character = new Character({
    user: req.user._id,
    campaign: campaign._id,
    name,
    type,
    maxHp,
    armorClass,
    initiativeBonus,
    stats,
    consumables,
    notes,
  });

  await character.save();

  return res.status(201).json(character);
};

export const getCharacter = async (req, res) => {
  if (!validateOptionalCampaignQuery(req, res)) return;

  const character = await Character.findOne(buildCharacterLookup(req));

  if (!character) {
    return res.status(404).json({ message: "Character not found" });
  }

  return res.status(200).json(character);
};

export const updateCharacter = async (req, res) => {
  if (!validateOptionalCampaignQuery(req, res)) return;

  const updates = pickAllowedFields(req.body, allowedUpdateFields);

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: "No valid character fields provided" });
  }

  const character = await Character.findOneAndUpdate(buildCharacterLookup(req), updates, {
    new: true,
    runValidators: true,
  });

  if (!character) {
    return res.status(404).json({ message: "Character not found" });
  }

  return res.status(200).json(character);
};

export const deleteCharacter = async (req, res) => {
  if (!validateOptionalCampaignQuery(req, res)) return;

  const character = await Character.findOneAndDelete(buildCharacterLookup(req));

  if (!character) {
    return res.status(404).json({ message: "Character not found" });
  }

  return res.status(200).json({ message: "Character deleted", character });
};
