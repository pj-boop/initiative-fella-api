import crypto from "crypto";
import Campaign from "../models/Campaign.js";
import Character from "../models/Character.js";
import LevelUpSession from "../models/LevelUpSession.js";
import LevelUpSubmission from "../models/LevelUpSubmission.js";
import { pickAllowedFields } from "../utils/pickAllowedFields.js";

const patchFields = ["level", "maxHp", "armorClass", "initiativeBonus", "notes"];
const snapshotFields = ["level", "maxHp", "armorClass", "initiativeBonus", "notes"];
const defaultExpiryHours = 48;
const maxExpiryHours = 24 * 14;

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");
const createPublicToken = () => crypto.randomBytes(32).toString("base64url");

const buildPublicUrl = (token) => {
  const baseUrl = process.env.PUBLIC_WEB_APP_URL || process.env.CLIENT_URL || "http://localhost:5173";
  return `${baseUrl.replace(/\/$/, "")}/level-up/${token}`;
};

const findUserCampaign = (campaignId, userId) => {
  return Campaign.findOne({
    _id: campaignId,
    user: userId,
  });
};

const snapshotCharacter = (character) => pickAllowedFields(character.toObject(), snapshotFields);

const isExpired = (session) => session.expiresAt.getTime() <= Date.now();

const closeExpiredSession = async (session) => {
  if (session.status === "open" && isExpired(session)) {
    session.status = "closed";
    session.tokenHash = undefined;
    await session.save();
  }
};

const getOpenPublicSession = async (token) => {
  const session = await LevelUpSession.findOne({ tokenHash: hashToken(token) });

  if (!session) {
    return { session: null, errorStatus: 404, message: "Level-up session not found" };
  }

  if (session.status !== "open") {
    return { session: null, errorStatus: 410, message: "Level-up session is not open" };
  }

  if (isExpired(session)) {
    await closeExpiredSession(session);
    return { session: null, errorStatus: 410, message: "Level-up session has expired" };
  }

  return { session };
};

const validateNumberPatchField = ({ patch, field, min, max, res }) => {
  if (!(field in patch)) return true;

  const value = Number(patch[field]);
  if (!Number.isInteger(value) || value < min || value > max) {
    res.status(400).json({ message: `${field} must be an integer between ${min} and ${max}` });
    return false;
  }

  patch[field] = value;
  return true;
};

const getValidatedPatch = (body, res) => {
  const patchSource = body?.patch && typeof body.patch === "object" ? body.patch : body;
  const patch = pickAllowedFields(patchSource ?? {}, patchFields);

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ message: "At least one level-up patch field is required" });
    return null;
  }

  if (!validateNumberPatchField({ patch, field: "level", min: 1, max: 20, res })) return null;
  if (!validateNumberPatchField({ patch, field: "maxHp", min: 1, max: Number.MAX_SAFE_INTEGER, res })) return null;
  if (!validateNumberPatchField({ patch, field: "armorClass", min: 1, max: 40, res })) return null;
  if (!validateNumberPatchField({ patch, field: "initiativeBonus", min: -20, max: 30, res })) return null;

  if ("notes" in patch) {
    patch.notes = String(patch.notes ?? "").trim();
  }

  return patch;
};

const buildReviewSession = (session) => ({
  id: session._id,
  campaign: session.campaign,
  title: session.title,
  targetLevel: session.targetLevel,
  status: session.status,
  expiresAt: session.expiresAt,
  allowedCharacterIds: session.allowedCharacterIds,
  createdAt: session.createdAt,
  updatedAt: session.updatedAt,
});

export const createLevelUpSession = async (req, res) => {
  const campaign = await findUserCampaign(req.params.campaignId, req.user._id);

  if (!campaign) {
    return res.status(404).json({ message: "Campaign not found" });
  }

  const { title, targetLevel, expiresInHours = defaultExpiryHours } = req.body;

  if (!title || targetLevel === undefined || targetLevel === null) {
    return res.status(400).json({ message: "title and targetLevel are required" });
  }

  const normalizedTargetLevel = Number(targetLevel);
  if (!Number.isInteger(normalizedTargetLevel) || normalizedTargetLevel < 1 || normalizedTargetLevel > 20) {
    return res.status(400).json({ message: "targetLevel must be an integer between 1 and 20" });
  }

  const normalizedExpiryHours = Number(expiresInHours);
  if (!Number.isFinite(normalizedExpiryHours) || normalizedExpiryHours <= 0 || normalizedExpiryHours > maxExpiryHours) {
    return res.status(400).json({ message: `expiresInHours must be greater than 0 and no more than ${maxExpiryHours}` });
  }

  const publicToken = createPublicToken();
  const session = await LevelUpSession.create({
    user: req.user._id,
    campaign: campaign._id,
    title,
    targetLevel: normalizedTargetLevel,
    tokenHash: hashToken(publicToken),
    status: "open",
    expiresAt: new Date(Date.now() + normalizedExpiryHours * 60 * 60 * 1000),
    allowedCharacterIds: campaign.defaultPartyCharacterIds,
  });

  return res.status(201).json({
    sessionId: session._id,
    publicToken,
    publicUrl: buildPublicUrl(publicToken),
  });
};

export const getPublicLevelUpSession = async (req, res) => {
  const { session, errorStatus, message } = await getOpenPublicSession(req.params.token);
  if (!session) return res.status(errorStatus).json({ message });

  const [campaign, characters] = await Promise.all([
    Campaign.findById(session.campaign).select("name"),
    Character.find({
      _id: { $in: session.allowedCharacterIds },
      campaign: session.campaign,
    }).select("name level maxHp armorClass initiativeBonus"),
  ]);

  if (!campaign) {
    return res.status(404).json({ message: "Campaign not found" });
  }

  return res.status(200).json({
    title: session.title,
    targetLevel: session.targetLevel,
    campaignName: campaign.name,
    status: session.status,
    characters: characters.map((character) => ({
      id: character._id,
      name: character.name,
      level: character.level,
      maxHp: character.maxHp,
      armorClass: character.armorClass,
      initiativeBonus: character.initiativeBonus,
    })),
  });
};

export const submitLevelUpCharacterUpdate = async (req, res) => {
  const { session, errorStatus, message } = await getOpenPublicSession(req.params.token);
  if (!session) return res.status(errorStatus).json({ message });

  const isAllowedCharacter = session.allowedCharacterIds.some((characterId) => characterId.equals(req.params.characterId));
  if (!isAllowedCharacter) {
    return res.status(404).json({ message: "Character not found for this level-up session" });
  }

  const character = await Character.findOne({
    _id: req.params.characterId,
    campaign: session.campaign,
  });

  if (!character) {
    return res.status(404).json({ message: "Character not found for this level-up session" });
  }

  const patch = getValidatedPatch(req.body, res);
  if (!patch) return;

  const submittedByName = String(req.body?.submittedByName ?? "").trim();
  const submission = await LevelUpSubmission.findOneAndUpdate(
    {
      session: session._id,
      campaign: session.campaign,
      character: character._id,
      status: "pending",
    },
    {
      $set: {
        submittedByName,
        previousSnapshot: snapshotCharacter(character),
        patch,
      },
      $setOnInsert: {
        session: session._id,
        campaign: session.campaign,
        character: character._id,
        status: "pending",
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  return res.status(200).json({
    submissionId: submission._id,
    status: submission.status,
    characterId: submission.character,
  });
};

export const reviewLevelUpSession = async (req, res) => {
  const campaign = await findUserCampaign(req.params.campaignId, req.user._id);
  if (!campaign) return res.status(404).json({ message: "Campaign not found" });

  const session = await LevelUpSession.findOne({
    _id: req.params.sessionId,
    campaign: campaign._id,
    user: req.user._id,
  });

  if (!session) return res.status(404).json({ message: "Level-up session not found" });

  await closeExpiredSession(session);

  const [submissions, characters] = await Promise.all([
    LevelUpSubmission.find({ session: session._id }).populate("character", "name").sort({ createdAt: 1 }),
    Character.find({ _id: { $in: session.allowedCharacterIds }, campaign: campaign._id }).select("name"),
  ]);

  const submittedCharacterIds = new Set(
    submissions
      .filter((submission) => submission.status === "pending" || submission.status === "accepted")
      .map((submission) => submission.character?._id?.toString() ?? submission.character?.toString())
  );

  return res.status(200).json({
    session: buildReviewSession(session),
    submissions: submissions.map((submission) => ({
      id: submission._id,
      characterId: submission.character?._id ?? submission.character,
      characterName: submission.character?.name ?? "Unknown character",
      submittedByName: submission.submittedByName,
      previousSnapshot: submission.previousSnapshot,
      patch: submission.patch,
      status: submission.status,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
    })),
    missingCharacters: characters
      .filter((character) => !submittedCharacterIds.has(character._id.toString()))
      .map((character) => character.name),
  });
};

export const acceptAllLevelUpSubmissions = async (req, res) => {
  const campaign = await findUserCampaign(req.params.campaignId, req.user._id);
  if (!campaign) return res.status(404).json({ message: "Campaign not found" });

  const session = await LevelUpSession.findOne({
    _id: req.params.sessionId,
    campaign: campaign._id,
    user: req.user._id,
  });

  if (!session) return res.status(404).json({ message: "Level-up session not found" });

  await closeExpiredSession(session);
  if (session.status !== "open") {
    return res.status(400).json({ message: "Level-up session is not open" });
  }

  const submissions = await LevelUpSubmission.find({
    session: session._id,
    campaign: campaign._id,
    status: "pending",
  });

  for (const submission of submissions) {
    const patch = getValidatedPatch({ patch: submission.patch }, res);
    if (!patch) return;

    await Character.findOneAndUpdate(
      {
        _id: submission.character,
        campaign: campaign._id,
        user: req.user._id,
      },
      patch,
      { runValidators: true }
    );

    submission.status = "accepted";
    await submission.save();
  }

  session.status = "completed";
  session.tokenHash = undefined;
  await session.save();

  return res.status(200).json({
    message: "Level-up submissions accepted",
    acceptedCount: submissions.length,
    session: buildReviewSession(session),
  });
};

export const discardAllLevelUpSubmissions = async (req, res) => {
  const campaign = await findUserCampaign(req.params.campaignId, req.user._id);
  if (!campaign) return res.status(404).json({ message: "Campaign not found" });

  const session = await LevelUpSession.findOne({
    _id: req.params.sessionId,
    campaign: campaign._id,
    user: req.user._id,
  });

  if (!session) return res.status(404).json({ message: "Level-up session not found" });

  await closeExpiredSession(session);
  if (session.status !== "open") {
    return res.status(400).json({ message: "Level-up session is not open" });
  }

  const result = await LevelUpSubmission.updateMany(
    {
      session: session._id,
      campaign: campaign._id,
      status: "pending",
    },
    { $set: { status: "discarded" } }
  );

  session.status = "discarded";
  session.tokenHash = undefined;
  await session.save();

  return res.status(200).json({
    message: "Level-up submissions discarded",
    discardedCount: result.modifiedCount,
    session: buildReviewSession(session),
  });
};
