import mongoose from "mongoose";
import Campaign from "../models/Campaign.js";
import Character from "../models/Character.js";
import { pickAllowedFields } from "../utils/pickAllowedFields.js";

const allowedCampaignUpdateFields = ["name", "notes", "defaultPartyCharacterIds"];

const findUserCampaign = (campaignId, userId) => {
  return Campaign.findOne({
    _id: campaignId,
    user: userId,
  });
};

const findCampaignOrRespond = async (req, res) => {
  const campaign = await findUserCampaign(req.params.campaignId, req.user._id);

  if (!campaign) {
    res.status(404).json({ message: "Campaign not found" });
    return null;
  }

  return campaign;
};

const validatePartyCharacterIds = async ({ characterIds, campaignId, userId, res }) => {
  if (!Array.isArray(characterIds)) {
    res.status(400).json({ message: "defaultPartyCharacterIds must be an array" });
    return false;
  }

  if (characterIds.some((characterId) => !mongoose.isValidObjectId(characterId))) {
    res.status(400).json({ message: "Invalid character id" });
    return false;
  }

  const uniqueCharacterIds = [...new Set(characterIds.map((characterId) => characterId.toString()))];
  const characterCount = await Character.countDocuments({
    _id: { $in: uniqueCharacterIds },
    user: userId,
    campaign: campaignId,
  });

  if (characterCount !== uniqueCharacterIds.length) {
    res.status(404).json({ message: "One or more characters were not found" });
    return false;
  }

  return true;
};

export const getCampaigns = async (req, res) => {
  const campaigns = await Campaign.find({ user: req.user._id }).sort({ createdAt: -1 });

  return res.status(200).json(campaigns);
};

export const createCampaign = async (req, res) => {
  const { name, notes, defaultPartyCharacterIds = [] } = req.body;

  if (!name) {
    return res.status(400).json({ message: "name is required" });
  }

  if (!Array.isArray(defaultPartyCharacterIds)) {
    return res.status(400).json({ message: "defaultPartyCharacterIds must be an array" });
  }

  if (defaultPartyCharacterIds.length > 0) {
    return res.status(400).json({
      message: "Create the campaign first, then add party characters",
    });
  }

  const campaign = await Campaign.create({
    user: req.user._id,
    name,
    notes,
    defaultPartyCharacterIds: [],
  });

  return res.status(201).json(campaign);
};

export const getCampaign = async (req, res) => {
  const campaign = await findCampaignOrRespond(req, res);
  if (!campaign) return;

  return res.status(200).json(campaign);
};

export const updateCampaign = async (req, res) => {
  const updates = pickAllowedFields(req.body, allowedCampaignUpdateFields);

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: "No valid campaign fields provided" });
  }

  const campaign = await findCampaignOrRespond(req, res);
  if (!campaign) return;

  if ("defaultPartyCharacterIds" in updates) {
    if (
      !(await validatePartyCharacterIds({
        characterIds: updates.defaultPartyCharacterIds,
        campaignId: campaign._id,
        userId: req.user._id,
        res,
      }))
    ) {
      return;
    }

    updates.defaultPartyCharacterIds = [
      ...new Set(updates.defaultPartyCharacterIds.map((characterId) => characterId.toString())),
    ];
  }

  campaign.set(updates);
  await campaign.save();

  return res.status(200).json(campaign);
};

export const deleteCampaign = async (req, res) => {
  const campaign = await Campaign.findOneAndDelete({
    _id: req.params.campaignId,
    user: req.user._id,
  });

  if (!campaign) {
    return res.status(404).json({ message: "Campaign not found" });
  }

  return res.status(200).json({ message: "Campaign deleted", campaign });
};

export const addPartyCharacter = async (req, res) => {
  const campaign = await findCampaignOrRespond(req, res);
  if (!campaign) return;

  const character = await Character.findOne({
    _id: req.params.characterId,
    user: req.user._id,
    campaign: req.params.campaignId,
  });

  if (!character) {
    return res.status(404).json({ message: "Character not found" });
  }

  if (!campaign.defaultPartyCharacterIds.some((characterId) => characterId.equals(character._id))) {
    campaign.defaultPartyCharacterIds.push(character._id);
    await campaign.save();
  }

  return res.status(200).json(campaign);
};

export const removePartyCharacter = async (req, res) => {
  const campaign = await findCampaignOrRespond(req, res);
  if (!campaign) return;

  campaign.defaultPartyCharacterIds = campaign.defaultPartyCharacterIds.filter(
    (characterId) => !characterId.equals(req.params.characterId)
  );
  await campaign.save();

  return res.status(200).json(campaign);
};
