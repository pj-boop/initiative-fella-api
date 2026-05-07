import express from "express";
import {
  addConsumable,
  addCustomEntry,
  addEntryCondition,
  addFromCharacter,
  damageEntry,
  healEntry,
  removeConsumable,
  removeEntry,
  removeEntryCondition,
  updateConsumable,
  updateEntry,
  updateTempHp,
  useEntryConsumable,
} from "../controllers/initiativeEntryController.js";
import asyncHandler from "../middleware/asyncHandler.middleware.js";
import validateObjectId from "../middleware/validateObjectId.middleware.js";

const router = express.Router({ mergeParams: true });
const validateEncounterId = validateObjectId("encounterId", "Invalid encounter id");
const validateEntryId = validateObjectId("entryId", "Invalid entry id");
const validateConsumableId = validateObjectId("consumableId", "Invalid consumable id");

router.use(validateEncounterId);

router.post("/from-character", asyncHandler(addFromCharacter));
router.post("/custom", asyncHandler(addCustomEntry));
router.post("/:entryId/damage", validateEntryId, asyncHandler(damageEntry));
router.post("/:entryId/heal", validateEntryId, asyncHandler(healEntry));
router.post("/:entryId/temp-hp", validateEntryId, asyncHandler(updateTempHp));
router.post("/:entryId/conditions", validateEntryId, asyncHandler(addEntryCondition));
router.delete("/:entryId/conditions/:condition", validateEntryId, asyncHandler(removeEntryCondition));
router.post("/:entryId/consumables", validateEntryId, asyncHandler(addConsumable));
router.post(
  "/:entryId/consumables/:consumableId/use",
  validateEntryId,
  validateConsumableId,
  asyncHandler(useEntryConsumable)
);
router.patch(
  "/:entryId/consumables/:consumableId",
  validateEntryId,
  validateConsumableId,
  asyncHandler(updateConsumable)
);
router.delete(
  "/:entryId/consumables/:consumableId",
  validateEntryId,
  validateConsumableId,
  asyncHandler(removeConsumable)
);
router.patch("/:entryId", validateEntryId, asyncHandler(updateEntry));
router.delete("/:entryId", validateEntryId, asyncHandler(removeEntry));

export default router;
