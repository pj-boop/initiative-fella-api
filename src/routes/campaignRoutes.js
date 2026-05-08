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
import asyncHandler from "../middleware/asyncHandler.middleware.js";
import validateObjectId from "../middleware/validateObjectId.middleware.js";

const router = express.Router();
const validateCampaignId = validateObjectId("campaignId", "Invalid campaign id");
const validateCharacterId = validateObjectId("characterId", "Invalid character id");

router.get("/", asyncHandler(getCampaigns));
router.post("/", asyncHandler(createCampaign));
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
