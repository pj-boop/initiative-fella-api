export const parsePositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const parseNonNegativeInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
};

export const getInitiativeRoll = (providedRoll) => {
  if (providedRoll === undefined || providedRoll === null) {
    return Math.floor(Math.random() * 20) + 1;
  }

  const parsedRoll = Number(providedRoll);
  return Number.isInteger(parsedRoll) && parsedRoll >= 1 && parsedRoll <= 20 ? parsedRoll : null;
};
