import express from "express";
import {
  addPartyCharacter,
  createCampaign,
  deleteCampaign,
  getCampaign,
  getCampaigns,
  removePartyCharacter,
  updateCampaign,
} from "../controllers/campaignController.js";
import {
  acceptAllLevelUpSubmissions,
  createLevelUpSession,
  discardAllLevelUpSubmissions,
  reviewLevelUpSession,
} from "../controllers/levelUpSessionController.js";
import asyncHandler from "../middleware/asyncHandler.middleware.js";
import validateObjectId from "../middleware/validateObjectId.middleware.js";

const router = express.Router();
const validateCampaignId = validateObjectId("campaignId", "Invalid campaign id");
const validateCharacterId = validateObjectId("characterId", "Invalid character id");
const validateSessionId = validateObjectId("sessionId", "Invalid level-up session id");

router.get("/", asyncHandler(getCampaigns));
router.post("/", asyncHandler(createCampaign));
router.post(
  "/:campaignId/level-up-sessions",
  validateCampaignId,
  asyncHandler(createLevelUpSession)
);
router.get(
  "/:campaignId/level-up-sessions/:sessionId",
  validateCampaignId,
  validateSessionId,
  asyncHandler(reviewLevelUpSession)
);
router.post(
  "/:campaignId/level-up-sessions/:sessionId/accept-all",
  validateCampaignId,
  validateSessionId,
  asyncHandler(acceptAllLevelUpSubmissions)
);
router.post(
  "/:campaignId/level-up-sessions/:sessionId/discard-all",
  validateCampaignId,
  validateSessionId,
  asyncHandler(discardAllLevelUpSubmissions)
);
router.post(
  "/:campaignId/party/:characterId",
  validateCampaignId,
  validateCharacterId,
  asyncHandler(addPartyCharacter)
);
router.delete(
  "/:campaignId/party/:characterId",
  validateCampaignId,
  validateCharacterId,
  asyncHandler(removePartyCharacter)
);
router.get("/:campaignId", validateCampaignId, asyncHandler(getCampaign));
router.patch("/:campaignId", validateCampaignId, asyncHandler(updateCampaign));
router.delete("/:campaignId", validateCampaignId, asyncHandler(deleteCampaign));

export default router;
