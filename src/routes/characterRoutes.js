import express from "express";
import {
  createCharacter,
  deleteCharacter,
  getCharacter,
  getCharacters,
  updateCharacter,
} from "../controllers/characterController.js";
import asyncHandler from "../middleware/asyncHandler.middleware.js";
import validateObjectId from "../middleware/validateObjectId.middleware.js";

const router = express.Router();
const validateCharacterId = validateObjectId("characterId", "Invalid character id");

router.get("/", asyncHandler(getCharacters));
router.post("/", asyncHandler(createCharacter));
router.get("/:characterId", validateCharacterId, asyncHandler(getCharacter));
router.patch("/:characterId", validateCharacterId, asyncHandler(updateCharacter));
router.delete("/:characterId", validateCharacterId, asyncHandler(deleteCharacter));

export default router;
