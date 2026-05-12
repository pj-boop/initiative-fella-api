export const isDown = (entry) => (entry.currentHp ?? 0) <= 0;

export const canAct = (entry) => entry.status === "active" && !isDown(entry);

export const normalizeCondition = (condition) => {
  if (typeof condition !== "string") {
    return "";
  }

  return condition.trim().toLowerCase();
};

export const applyDamage = (entry, amount) => {
  const currentTempHp = entry.tempHp ?? 0;
  const absorbedByTempHp = Math.min(currentTempHp, amount);
  const remainingDamage = amount - absorbedByTempHp;

  entry.tempHp = currentTempHp - absorbedByTempHp;
  entry.currentHp = Math.max(entry.currentHp - remainingDamage, 0);

  if (entry.currentHp === 0) {
    entry.status = "down";
  }

  return entry;
};

export const applyHealing = (entry, amount) => {
  entry.currentHp = Math.min(entry.currentHp + amount, entry.maxHp);

  if (entry.currentHp > 0 && entry.status === "down") {
    entry.status = "active";
  }

  return entry;
};

export const setTempHp = (entry, amount) => {
  entry.tempHp = amount;
  return entry;
};

export const addCondition = (entry, condition) => {
  if (!entry.conditions.includes(condition)) {
    entry.conditions.push(condition);
  }

  return entry;
};

export const removeCondition = (entry, condition) => {
  entry.conditions = entry.conditions.filter((entryCondition) => normalizeCondition(entryCondition) !== condition);
  return entry;
};
