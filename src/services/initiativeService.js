import { getInitiativeRoll, parseNonNegativeInt, parsePositiveInt } from "../utils/numbers.js";

export const isTurnEligibleEntry = (entry) => {
  return entry.status !== "removed" && entry.status !== "dead";
};

export const getTurnEntryIndexes = (encounter) => {
  return encounter.entries.reduce((indexes, entry, index) => {
    if (isTurnEligibleEntry(entry)) {
      indexes.push(index);
    }

    return indexes;
  }, []);
};

export const getCurrentEntry = (encounter) => encounter.entries[encounter.currentTurnIndex] ?? null;

export const buildTurnResponse = (encounter) => ({
  encounter,
  currentEntry: getCurrentEntry(encounter),
});

export const compareInitiativeEntries = (firstEntry, secondEntry) => {
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

export const getProvidedInitiativeRolls = (rollsByEntryId) => {
  if (!rollsByEntryId || typeof rollsByEntryId !== "object" || Array.isArray(rollsByEntryId)) {
    return {};
  }

  return rollsByEntryId;
};

export const getManualInitiativesByEntryId = (manualInitiatives) => {
  if (manualInitiatives === undefined || manualInitiatives === null) {
    return { manualInitiativesByEntryId: new Map() };
  }

  if (!Array.isArray(manualInitiatives)) {
    return { error: "manualInitiatives must be an array" };
  }

  const manualInitiativesByEntryId = new Map();

  for (const manualInitiative of manualInitiatives) {
    if (
      !manualInitiative ||
      typeof manualInitiative !== "object" ||
      Array.isArray(manualInitiative)
    ) {
      return { error: "manualInitiatives entries must be objects" };
    }

    const { entryId, initiativeTotal } = manualInitiative;

    if (typeof entryId !== "string" || entryId.trim() === "") {
      return { error: "manualInitiatives entryId is required" };
    }

    if (initiativeTotal === undefined || initiativeTotal === null || initiativeTotal === "") {
      continue;
    }

    const parsedTotal = Number(initiativeTotal);

    if (!Number.isInteger(parsedTotal)) {
      return { error: "manualInitiatives initiativeTotal must be an integer" };
    }

    manualInitiativesByEntryId.set(entryId, parsedTotal);
  }

  return { manualInitiativesByEntryId };
};

const applyInitiativeRoll = (entry, providedRoll) => {
  const roll = getInitiativeRoll(providedRoll);

  if (roll === null) {
    return false;
  }

  entry.initiativeSource = "auto";
  entry.initiativeRoll = roll;
  entry.initiativeTotal = roll + (entry.initiativeBonus ?? 0);
  return true;
};

export const rollInitiative = (
  encounter,
  {
    manualInitiativesByEntryId = new Map(),
    rollMissing = true,
    rerollExisting = false,
    rollsByEntryId = {},
  } = {},
) => {
  const turnEntryIndexes = getTurnEntryIndexes(encounter);

  for (const entryIndex of turnEntryIndexes) {
    const entry = encounter.entries[entryIndex];
    const entryId = entry._id.toString();

    if (manualInitiativesByEntryId.has(entryId)) {
      entry.initiativeSource = "manual";
      entry.initiativeRoll = null;
      entry.initiativeTotal = manualInitiativesByEntryId.get(entryId);
      continue;
    }

    const hasExistingInitiative =
      entry.initiativeTotal !== null && entry.initiativeTotal !== undefined;

    if (hasExistingInitiative && !rerollExisting) {
      continue;
    }

    if (!hasExistingInitiative && !rollMissing) {
      continue;
    }

    if (!applyInitiativeRoll(entry, rollsByEntryId[entryId])) {
      return false;
    }
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
  return true;
};

export const startEncounter = (encounter, turnEntryIndexes) => {
  encounter.status = "active";
  encounter.round = 1;
  encounter.currentTurnIndex = turnEntryIndexes[0];
  return encounter;
};

export const advanceTurn = (encounter, turnEntryIndexes) => {
  const currentTurnPosition = turnEntryIndexes.indexOf(encounter.currentTurnIndex);
  const nextTurnPosition =
    currentTurnPosition === -1 ? 0 : (currentTurnPosition + 1) % turnEntryIndexes.length;

  if (currentTurnPosition !== -1 && nextTurnPosition === 0) {
    encounter.round += 1;
  }

  encounter.currentTurnIndex = turnEntryIndexes[nextTurnPosition];
  return encounter;
};

export const reverseTurn = (encounter, turnEntryIndexes) => {
  const currentTurnPosition = turnEntryIndexes.indexOf(encounter.currentTurnIndex);
  const safeCurrentTurnPosition = currentTurnPosition === -1 ? 0 : currentTurnPosition;
  const previousTurnPosition =
    safeCurrentTurnPosition === 0 ? turnEntryIndexes.length - 1 : safeCurrentTurnPosition - 1;

  if (currentTurnPosition !== -1 && safeCurrentTurnPosition === 0 && encounter.round > 1) {
    encounter.round -= 1;
  }

  encounter.currentTurnIndex = turnEntryIndexes[previousTurnPosition];
  return encounter;
};

export const setCurrentTurn = (encounter, { currentTurnIndex, entryId, round }, turnEntryIndexes) => {
  if (round !== undefined) {
    const parsedRound = parsePositiveInt(round);

    if (parsedRound === null) {
      return { error: "round must be a positive integer" };
    }

    encounter.round = parsedRound;
  }

  if (currentTurnIndex !== undefined) {
    const parsedTurnIndex = parseNonNegativeInt(currentTurnIndex);

    if (parsedTurnIndex === null || !turnEntryIndexes.includes(parsedTurnIndex)) {
      return { error: "currentTurnIndex must point to a turn-eligible entry" };
    }

    encounter.currentTurnIndex = parsedTurnIndex;
  }

  if (entryId !== undefined) {
    const entryIndex = encounter.entries.findIndex((entry) => entry._id.toString() === entryId);

    if (entryIndex === -1) {
      return { error: "Entry not found", status: 404 };
    }

    if (!turnEntryIndexes.includes(entryIndex)) {
      return { error: "entryId must point to a turn-eligible entry" };
    }

    encounter.currentTurnIndex = entryIndex;
  }

  return { encounter };
};
