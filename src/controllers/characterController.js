import Character from "../models/Character.js";
import { pickAllowedFields } from "../utils/pickAllowedFields.js";

const allowedUpdateFields = [
  "name",
  "type",
  "maxHp",
  "armorClass",
  "initiativeBonus",
  "stats",
  "consumables",
  "notes",
];

const buildCharacterFilters = (query) => {
  const filters = {};

  if (query.type) {
    filters.type = query.type.toLowerCase();
  }

  return filters;
};

export const getCharacters = async (req, res) => {
  const characters = await Character.find({
    user: req.user._id,
    ...buildCharacterFilters(req.query),
  }).sort({ createdAt: -1 });

  res.status(200).json(characters);
};

export const createCharacter = async (req, res) => {
  const { name, type, maxHp, armorClass, initiativeBonus, stats, consumables, notes } = req.body;

  if (!name || !type || maxHp === undefined || maxHp === null) {
    return res.status(400).json({ message: "name, type, and maxHp are required" });
  }

  const character = new Character({
    user: req.user._id,
    name,
    type,
    maxHp,
    armorClass,
    initiativeBonus,
    stats,
    consumables,
    notes,
  });

  await character.save();

  return res.status(201).json(character);
};

export const getCharacter = async (req, res) => {
  const character = await Character.findOne({
    _id: req.params.characterId,
    user: req.user._id,
  });

  if (!character) {
    return res.status(404).json({ message: "Character not found" });
  }

  return res.status(200).json(character);
};

export const updateCharacter = async (req, res) => {
  const updates = pickAllowedFields(req.body, allowedUpdateFields);

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: "No valid character fields provided" });
  }

  const character = await Character.findOneAndUpdate(
    {
      _id: req.params.characterId,
      user: req.user._id,
    },
    updates,
    {
      new: true,
      runValidators: true,
    }
  );

  if (!character) {
    return res.status(404).json({ message: "Character not found" });
  }

  return res.status(200).json(character);
};

export const deleteCharacter = async (req, res) => {
  const character = await Character.findOneAndDelete({
    _id: req.params.characterId,
    user: req.user._id,
  });

  if (!character) {
    return res.status(404).json({ message: "Character not found" });
  }

  return res.status(200).json({ message: "Character deleted", character });
};
