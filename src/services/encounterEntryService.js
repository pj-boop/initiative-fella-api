import Character from "../models/Character.js";

const clearInitiative = (entry) => {
  entry.initiativeSource = null;
  entry.initiativeRoll = null;
  entry.initiativeTotal = null;
};

const applyManualInitiativeTotal = (entry) => {
  if (
    entry.initiativeTotal === null ||
    entry.initiativeTotal === undefined ||
    entry.initiativeTotal === ""
  ) {
    clearInitiative(entry);
    return;
  }

  entry.initiativeSource = "manual";
  entry.initiativeRoll = null;
};

const applyAutomaticInitiativeRoll = (entry) => {
  if (
    entry.initiativeRoll === null ||
    entry.initiativeRoll === undefined ||
    entry.initiativeRoll === ""
  ) {
    clearInitiative(entry);
    return;
  }

  entry.initiativeSource = "auto";
  entry.initiativeTotal = entry.initiativeRoll + (entry.initiativeBonus ?? 0);
};

export const normalizeInitiativeFields = (
  entry,
  { initiativeRollProvided = false, initiativeTotalProvided = false } = {},
) => {
  if (initiativeTotalProvided) {
    applyManualInitiativeTotal(entry);
    return;
  }

  if (initiativeRollProvided || entry.initiativeSource !== "manual") {
    applyAutomaticInitiativeRoll(entry);
  }
};

export const recalculateInitiativeTotal = (entry) => {
  normalizeInitiativeFields(entry, { initiativeRollProvided: true });
};

export const buildEntrySnapshot = ({
  characterId,
  name,
  type,
  maxHp,
  currentHp,
  tempHp,
  armorClass,
  initiativeBonus,
  initiativeRoll,
  initiativeTotal,
  stats,
  consumables,
  conditions,
  status,
  notes,
}) => {
  const entry = {
    characterId,
    name,
    type,
    maxHp,
    currentHp: currentHp ?? maxHp,
    tempHp,
    armorClass,
    initiativeBonus,
    initiativeRoll,
    initiativeTotal,
    stats,
    consumables,
    conditions,
    status,
    notes,
  };

  normalizeInitiativeFields(entry, {
    initiativeRollProvided: initiativeRoll !== undefined,
    initiativeTotalProvided: initiativeTotal !== undefined,
  });

  return entry;
};

export const buildEntryFromCharacter = (character) => {
  return buildEntrySnapshot({
    characterId: character._id,
    name: character.name,
    type: character.type,
    maxHp: character.maxHp,
    currentHp: character.maxHp,
    armorClass: character.armorClass,
    initiativeBonus: character.initiativeBonus,
    stats: character.stats,
    consumables: character.consumables,
    notes: character.notes,
  });
};

const getEntryCharacterId = (entry) => {
  if (!entry.characterId) {
    return null;
  }

  return entry.characterId.toString();
};

export const addDefaultPartyEntries = async ({ encounter, campaign, userId }) => {
  const defaultPartyCharacterIds = campaign.defaultPartyCharacterIds ?? [];

  if (defaultPartyCharacterIds.length === 0) {
    return [];
  }

  const existingCharacterIds = new Set(
    encounter.entries.map(getEntryCharacterId).filter(Boolean)
  );
  const characterIdsToAdd = [];

  for (const characterId of defaultPartyCharacterIds) {
    const normalizedCharacterId = characterId.toString();

    if (existingCharacterIds.has(normalizedCharacterId)) {
      continue;
    }

    existingCharacterIds.add(normalizedCharacterId);
    characterIdsToAdd.push(characterId);
  }

  if (characterIdsToAdd.length === 0) {
    return [];
  }

  const characters = await Character.find({
    _id: { $in: characterIdsToAdd },
    user: userId,
    campaign: campaign._id,
  });
  const charactersById = new Map(
    characters.map((character) => [character._id.toString(), character])
  );
  const addedEntries = [];

  for (const characterId of characterIdsToAdd) {
    const character = charactersById.get(characterId.toString());

    if (!character) {
      continue;
    }

    const entry = buildEntryFromCharacter(character);
    encounter.entries.push(entry);
    addedEntries.push(encounter.entries.at(-1));
  }

  return addedEntries;
};
