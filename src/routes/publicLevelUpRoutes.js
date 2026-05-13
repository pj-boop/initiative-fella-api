import express from "express";
import {
  getPublicLevelUpSession,
  submitLevelUpCharacterUpdate,
} from "../controllers/levelUpSessionController.js";
import asyncHandler from "../middleware/asyncHandler.middleware.js";
import validateObjectId from "../middleware/validateObjectId.middleware.js";

const router = express.Router();
const validateCharacterId = validateObjectId("characterId", "Invalid character id");

router.get("/:token", asyncHandler(getPublicLevelUpSession));
router.post(
  "/:token/characters/:characterId/submissions",
  validateCharacterId,
  asyncHandler(submitLevelUpCharacterUpdate)
);

export default router;
