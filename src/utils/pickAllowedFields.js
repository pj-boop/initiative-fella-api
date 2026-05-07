export const pickAllowedFields = (body, allowedFields) => {
  return Object.fromEntries(
    Object.entries(body ?? {}).filter(([field]) => allowedFields.includes(field))
  );
};
