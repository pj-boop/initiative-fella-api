import express from "express";
import {
  createEncounter,
  deleteEncounter,
  endEncounter,
  getEncounter,
  getEncounters,
  nextTurn,
  previousTurn,
  rollInitiative,
  startEncounter,
  updateCurrentTurn,
  updateEncounter,
} from "../controllers/encounterController.js";
import asyncHandler from "../middleware/asyncHandler.middleware.js";
import validateObjectId from "../middleware/validateObjectId.middleware.js";

const router = express.Router();
const validateEncounterId = validateObjectId("encounterId", "Invalid encounter id");

router.get("/", asyncHandler(getEncounters));
router.post("/", asyncHandler(createEncounter));
router.post("/:encounterId/roll-initiative", validateEncounterId, asyncHandler(rollInitiative));
router.post("/:encounterId/start", validateEncounterId, asyncHandler(startEncounter));
router.post("/:encounterId/turns/next", validateEncounterId, asyncHandler(nextTurn));
router.post("/:encounterId/turns/previous", validateEncounterId, asyncHandler(previousTurn));
router.patch("/:encounterId/turns/current", validateEncounterId, asyncHandler(updateCurrentTurn));
router.post("/:encounterId/end", validateEncounterId, asyncHandler(endEncounter));
router.get("/:encounterId", validateEncounterId, asyncHandler(getEncounter));
router.patch("/:encounterId", validateEncounterId, asyncHandler(updateEncounter));
router.delete("/:encounterId", validateEncounterId, asyncHandler(deleteEncounter));

export default router;
