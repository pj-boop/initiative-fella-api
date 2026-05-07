import express from "express";
import mongoose from "mongoose";
import Encounter from "../models/Encounter.js";

const router = express.Router();

const allowedEncounterUpdateFields = ["name", "status", "notes"];

const validateEncounterId = (req, res, next) => {
  if (!mongoose.isValidObjectId(req.params.encounterId)) {
    return res.status(400).json({ message: "Invalid encounter id" });
  }

  return next();
};

const buildEncounterFilters = (query) => {
  const filters = {};

  if (query.status) {
    filters.status = query.status.toLowerCase();
  }

  return filters;
};

const pickAllowedFields = (body) => {
  return Object.fromEntries(
    Object.entries(body).filter(([field]) => allowedEncounterUpdateFields.includes(field))
  );
};

const findUserEncounter = (encounterId, userId) => {
  return Encounter.findOne({
    _id: encounterId,
    user: userId,
  });
};

const isTurnEligibleEntry = (entry) => {
  return entry.status !== "removed" && entry.status !== "dead";
};

const getTurnEntryIndexes = (encounter) => {
  return encounter.entries.reduce((indexes, entry, index) => {
    if (isTurnEligibleEntry(entry)) {
      indexes.push(index);
    }

    return indexes;
  }, []);
};

const getCurrentEntry = (encounter) => encounter.entries[encounter.currentTurnIndex] ?? null;

const buildTurnResponse = (encounter) => ({
  encounter,
  currentEntry: getCurrentEntry(encounter),
});

const getRequiredTurnEntryIndexes = (encounter, res) => {
  const turnEntryIndexes = getTurnEntryIndexes(encounter);

  if (turnEntryIndexes.length === 0) {
    res.status(400).json({ message: "Encounter must have at least one turn-eligible entry" });
    return null;
  }

  return turnEntryIndexes;
};

const parseNonNegativeInteger = (value) => {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 0) {
    return null;
  }

  return parsedValue;
};

const parsePositiveInteger = (value) => {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue < 1) {
    return null;
  }

  return parsedValue;
};

const getInitiativeRoll = (providedRoll) => {
  if (providedRoll === undefined || providedRoll === null) {
    return Math.floor(Math.random() * 20) + 1;
  }

  const parsedRoll = Number(providedRoll);

  if (!Number.isInteger(parsedRoll) || parsedRoll < 1 || parsedRoll > 20) {
    return null;
  }

  return parsedRoll;
};

const getProvidedInitiativeRolls = (rollsByEntryId) => {
  if (!rollsByEntryId || typeof rollsByEntryId !== "object" || Array.isArray(rollsByEntryId)) {
    return {};
  }

  return rollsByEntryId;
};

const compareInitiativeEntries = (firstEntry, secondEntry) => {
  const firstTotal = firstEntry.initiativeTotal ?? Number.NEGATIVE_INFINITY;
  const secondTotal = secondEntry.initiativeTotal ?? Number.NEGATIVE_INFINITY;

  if (firstTotal !== secondTotal) {
    return secondTotal - firstTotal;
  }

  const firstBonus = firstEntry.initiativeBonus ?? 0;
  const secondBonus = secondEntry.initiativeBonus ?? 0;

  if (firstBonus !== secondBonus) {
    return secondBonus - firstBonus;
  }

  return firstEntry.name.localeCompare(secondEntry.name);
};

router.get("/", async (req, res) => {
  try {
    const encounters = await Encounter.find({
      user: req.user._id,
      ...buildEncounterFilters(req.query),
    }).sort({ createdAt: -1 });

    res.status(200).json(encounters);
  } catch (error) {
    console.log("Error in get encounters route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, notes } = req.body;

    if (!name) {
      return res.status(400).json({ message: "name is required" });
    }

    const encounter = new Encounter({
      user: req.user._id,
      name,
      notes,
    });

    await encounter.save();

    res.status(201).json(encounter);
  } catch (error) {
    console.log("Error in create encounter route", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/:encounterId/roll-initiative", validateEncounterId, async (req, res) => {
  try {
    const encounter = await findUserEncounter(req.params.encounterId, req.user._id);

    if (!encounter) {
      return res.status(404).json({ message: "Encounter not found" });
    }

    const turnEntryIndexes = getRequiredTurnEntryIndexes(encounter, res);
    if (!turnEntryIndexes) return;

    const rollsByEntryId = getProvidedInitiativeRolls(req.body?.rollsByEntryId);

    for (const entryIndex of turnEntryIndexes) {
      const entry = encounter.entries[entryIndex];
      const roll = getInitiativeRoll(rollsByEntryId[entry._id.toString()]);

      if (roll === null) {
        return res.status(400).json({ message: "initiative rolls must be integers from 1 to 20" });
      }

      entry.initiativeRoll = roll;
      entry.initiativeTotal = roll + (entry.initiativeBonus ?? 0);
    }

    encounter.entries.sort((firstEntry, secondEntry) => {
      const firstEntryIsEligible = isTurnEligibleEntry(firstEntry);
      const secondEntryIsEligible = isTurnEligibleEntry(secondEntry);

      if (!firstEntryIsEligible && !secondEntryIsEligible) {
        return 0;
      }

      if (!firstEntryIsEligible) {
        return 1;
      }

      if (!secondEntryIsEligible) {
        return -1;
      }

      return compareInitiativeEntries(firstEntry, secondEntry);
    });

    encounter.currentTurnIndex = getTurnEntryIndexes(encounter)[0];
    encounter.markModified("entries");
    await encounter.save();

    res.status(200).json(buildTurnResponse(encounter));
  } catch (error) {
    console.log("Error in roll initiative route", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/:encounterId/start", validateEncounterId, async (req, res) => {
  try {
    const encounter = await findUserEncounter(req.params.encounterId, req.user._id);

    if (!encounter) {
      return res.status(404).json({ message: "Encounter not found" });
    }

    const turnEntryIndexes = getRequiredTurnEntryIndexes(encounter, res);
    if (!turnEntryIndexes) return;

    encounter.status = "active";
    encounter.round = 1;
    encounter.currentTurnIndex = turnEntryIndexes[0];
    await encounter.save();

    res.status(200).json(buildTurnResponse(encounter));
  } catch (error) {
    console.log("Error in start encounter route", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/:encounterId/turns/next", validateEncounterId, async (req, res) => {
  try {
    const encounter = await findUserEncounter(req.params.encounterId, req.user._id);

    if (!encounter) {
      return res.status(404).json({ message: "Encounter not found" });
    }

    const turnEntryIndexes = getRequiredTurnEntryIndexes(encounter, res);
    if (!turnEntryIndexes) return;

    const currentTurnPosition = turnEntryIndexes.indexOf(encounter.currentTurnIndex);
    const nextTurnPosition =
      currentTurnPosition === -1 ? 0 : (currentTurnPosition + 1) % turnEntryIndexes.length;

    if (currentTurnPosition !== -1 && nextTurnPosition === 0) {
      encounter.round += 1;
    }

    encounter.currentTurnIndex = turnEntryIndexes[nextTurnPosition];
    await encounter.save();

    res.status(200).json(buildTurnResponse(encounter));
  } catch (error) {
    console.log("Error in next turn route", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/:encounterId/turns/previous", validateEncounterId, async (req, res) => {
  try {
    const encounter = await findUserEncounter(req.params.encounterId, req.user._id);

    if (!encounter) {
      return res.status(404).json({ message: "Encounter not found" });
    }

    const turnEntryIndexes = getRequiredTurnEntryIndexes(encounter, res);
    if (!turnEntryIndexes) return;

    const currentTurnPosition = turnEntryIndexes.indexOf(encounter.currentTurnIndex);
    const safeCurrentTurnPosition = currentTurnPosition === -1 ? 0 : currentTurnPosition;
    const previousTurnPosition =
      safeCurrentTurnPosition === 0 ? turnEntryIndexes.length - 1 : safeCurrentTurnPosition - 1;

    if (currentTurnPosition !== -1 && safeCurrentTurnPosition === 0 && encounter.round > 1) {
      encounter.round -= 1;
    }

    encounter.currentTurnIndex = turnEntryIndexes[previousTurnPosition];
    await encounter.save();

    res.status(200).json(buildTurnResponse(encounter));
  } catch (error) {
    console.log("Error in previous turn route", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/:encounterId/turns/current", validateEncounterId, async (req, res) => {
  try {
    const { currentTurnIndex, entryId, round } = req.body ?? {};

    if (currentTurnIndex === undefined && entryId === undefined && round === undefined) {
      return res.status(400).json({ message: "currentTurnIndex, entryId, or round is required" });
    }

    if (currentTurnIndex !== undefined && entryId !== undefined) {
      return res.status(400).json({ message: "Provide either currentTurnIndex or entryId, not both" });
    }

    const encounter = await findUserEncounter(req.params.encounterId, req.user._id);

    if (!encounter) {
      return res.status(404).json({ message: "Encounter not found" });
    }

    const turnEntryIndexes = getRequiredTurnEntryIndexes(encounter, res);
    if (!turnEntryIndexes) return;

    if (round !== undefined) {
      const parsedRound = parsePositiveInteger(round);

      if (parsedRound === null) {
        return res.status(400).json({ message: "round must be a positive integer" });
      }

      encounter.round = parsedRound;
    }

    if (currentTurnIndex !== undefined) {
      const parsedTurnIndex = parseNonNegativeInteger(currentTurnIndex);

      if (parsedTurnIndex === null || !turnEntryIndexes.includes(parsedTurnIndex)) {
        return res.status(400).json({ message: "currentTurnIndex must point to a turn-eligible entry" });
      }

      encounter.currentTurnIndex = parsedTurnIndex;
    }

    if (entryId !== undefined) {
      if (!mongoose.isValidObjectId(entryId)) {
        return res.status(400).json({ message: "Invalid entry id" });
      }

      const entryIndex = encounter.entries.findIndex((entry) => entry._id.toString() === entryId);

      if (entryIndex === -1) {
        return res.status(404).json({ message: "Entry not found" });
      }

      if (!turnEntryIndexes.includes(entryIndex)) {
        return res.status(400).json({ message: "entryId must point to a turn-eligible entry" });
      }

      encounter.currentTurnIndex = entryIndex;
    }

    await encounter.save();

    res.status(200).json(buildTurnResponse(encounter));
  } catch (error) {
    console.log("Error in update current turn route", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/:encounterId/end", validateEncounterId, async (req, res) => {
  try {
    const encounter = await findUserEncounter(req.params.encounterId, req.user._id);

    if (!encounter) {
      return res.status(404).json({ message: "Encounter not found" });
    }

    encounter.status = "completed";
    await encounter.save();

    res.status(200).json(buildTurnResponse(encounter));
  } catch (error) {
    console.log("Error in end encounter route", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/:encounterId", validateEncounterId, async (req, res) => {
  try {
    const encounter = await Encounter.findOne({
      _id: req.params.encounterId,
      user: req.user._id,
    });

    if (!encounter) {
      return res.status(404).json({ message: "Encounter not found" });
    }

    res.status(200).json(encounter);
  } catch (error) {
    console.log("Error in get encounter route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/:encounterId", validateEncounterId, async (req, res) => {
  try {
    const updates = pickAllowedFields(req.body);

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

    res.status(200).json(encounter);
  } catch (error) {
    console.log("Error in update encounter route", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }

    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/:encounterId", validateEncounterId, async (req, res) => {
  try {
    const encounter = await Encounter.findOneAndDelete({
      _id: req.params.encounterId,
      user: req.user._id,
    });

    if (!encounter) {
      return res.status(404).json({ message: "Encounter not found" });
    }

    res.status(200).json({ message: "Encounter deleted", encounter });
  } catch (error) {
    console.log("Error in delete encounter route", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
