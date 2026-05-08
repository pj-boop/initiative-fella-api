import type { components } from "./schema";

type Schemas = components["schemas"];

export type ApiError = Schemas["ApiError"];

export type LoginRequest = Schemas["LoginRequest"];
export type RegisterRequest = Schemas["RegisterRequest"];
export type AuthResponse = Schemas["AuthResponse"];
export type AuthUser = Schemas["AuthUser"];

export type Campaign = Schemas["Campaign"];
export type CreateCampaignRequest = Schemas["CreateCampaignRequest"];
export type UpdateCampaignRequest = Schemas["UpdateCampaignRequest"];

export type Character = Schemas["Character"];
export type CreateCharacterRequest = Schemas["CreateCharacterRequest"];
export type UpdateCharacterRequest = Schemas["UpdateCharacterRequest"];
export type CharacterType = Schemas["CharacterType"];

export type Encounter = Schemas["Encounter"];
export type CreateEncounterRequest = Schemas["CreateEncounterRequest"];
export type UpdateEncounterRequest = Schemas["UpdateEncounterRequest"];
export type EncounterStatus = Schemas["EncounterStatus"];
export type TurnResponse = Schemas["TurnResponse"];

export type InitiativeEntry = Schemas["InitiativeEntry"];
export type CreateInitiativeEntryRequest = Schemas["CreateInitiativeEntryRequest"];
export type UpdateInitiativeEntryRequest = Schemas["UpdateInitiativeEntryRequest"];
export type EntryMutationResponse = Schemas["EntryMutationResponse"];
export type EntryStatus = Schemas["EntryStatus"];
export type RollInitiativeRequest = Schemas["RollInitiativeRequest"];
export type UpdateCurrentTurnRequest = Schemas["UpdateCurrentTurnRequest"];

export type Consumable = Schemas["Consumable"];
export type CreateConsumableRequest = Schemas["CreateConsumableRequest"];
export type UpdateConsumableRequest = Schemas["UpdateConsumableRequest"];
export type ConsumableMutationResponse = Schemas["ConsumableMutationResponse"];
export type ConsumableResetOn = Schemas["ConsumableResetOn"];
