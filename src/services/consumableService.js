export const useConsumable = (consumable) => {
  if (consumable.currentUses <= 0) {
    return false;
  }

  consumable.currentUses -= 1;
  return true;
};
