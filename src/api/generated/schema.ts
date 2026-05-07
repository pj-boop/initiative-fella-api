/**
 * This file mirrors the OpenAPI component types generated from docs/openapi.yaml.
 * Run `npm run api:types` to regenerate it with openapi-typescript after
 * dependencies are installed.
 */

export interface paths {}
export type webhooks = Record<string, never>;
export interface operations {}

export interface components {
  schemas: {
    ObjectId: string;
    DateTime: string;
    CharacterType: "player" | "npc" | "monster";
    EncounterStatus: "draft" | "active" | "completed";
    EntryStatus: "active" | "down" | "dead" | "removed";
    ConsumableResetOn: "shortRest" | "longRest" | "never";
    ApiError: {
      message: string;
    };
    AuthUser: {
      id: components["schemas"]["ObjectId"];
      username: string;
      email: string;
      profileImage: string;
      createdAt: components["schemas"]["DateTime"];
    };
    AuthResponse: {
      token: string;
      user: components["schemas"]["AuthUser"];
    };
    RegisterRequest: {
      username: string;
      email: string;
      password: string;
    };
    LoginRequest: {
      email: string;
      password: string;
    };
    Character: {
      _id: components["schemas"]["ObjectId"];
      user: components["schemas"]["ObjectId"];
      name: string;
      type: components["schemas"]["CharacterType"];
      maxHp: number;
      armorClass: number;
      initiativeBonus: number;
      stats: Record<string, unknown>;
      consumables: components["schemas"]["Consumable"][];
      notes: string;
      createdAt: components["schemas"]["DateTime"];
      updatedAt: components["schemas"]["DateTime"];
    };
    CreateCharacterRequest: {
      name: string;
      type: components["schemas"]["CharacterType"];
      maxHp: number;
      armorClass?: number;
      initiativeBonus?: number;
      stats?: Record<string, unknown>;
      consumables?: components["schemas"]["Consumable"][];
      notes?: string;
    };
    UpdateCharacterRequest: {
      name?: string;
      type?: components["schemas"]["CharacterType"];
      maxHp?: number;
      armorClass?: number;
      initiativeBonus?: number;
      stats?: Record<string, unknown>;
      consumables?: components["schemas"]["Consumable"][];
      notes?: string;
    };
    Encounter: {
      _id: components["schemas"]["ObjectId"];
      user: components["schemas"]["ObjectId"];
      name: string;
      status: components["schemas"]["EncounterStatus"];
      round: number;
      currentTurnIndex: number;
      entries: components["schemas"]["InitiativeEntry"][];
      notes: string;
      createdAt: components["schemas"]["DateTime"];
      updatedAt: components["schemas"]["DateTime"];
    };
    CreateEncounterRequest: {
      name: string;
      notes?: string;
    };
    UpdateEncounterRequest: {
      name?: string;
      status?: components["schemas"]["EncounterStatus"];
      notes?: string;
    };
    InitiativeEntry: {
      _id: components["schemas"]["ObjectId"];
      characterId?: components["schemas"]["ObjectId"] | null;
      name: string;
      type: components["schemas"]["CharacterType"];
      maxHp: number;
      currentHp: number;
      tempHp: number;
      armorClass: number;
      initiativeBonus: number;
      initiativeRoll: number | null;
      initiativeTotal: number | null;
      stats: Record<string, unknown>;
      consumables: components["schemas"]["Consumable"][];
      conditions: string[];
      status: components["schemas"]["EntryStatus"];
      notes: string;
      createdAt: components["schemas"]["DateTime"];
      updatedAt: components["schemas"]["DateTime"];
    };
    CreateInitiativeEntryRequest: {
      characterId?: components["schemas"]["ObjectId"];
      name: string;
      type: components["schemas"]["CharacterType"];
      maxHp: number;
      currentHp?: number;
      tempHp?: number;
      armorClass?: number;
      initiativeBonus?: number;
      initiativeRoll?: number | null;
      stats?: Record<string, unknown>;
      consumables?: components["schemas"]["Consumable"][];
      conditions?: string[];
      status?: components["schemas"]["EntryStatus"];
      notes?: string;
    };
    UpdateInitiativeEntryRequest: {
      name?: string;
      type?: components["schemas"]["CharacterType"];
      maxHp?: number;
      currentHp?: number;
      tempHp?: number;
      armorClass?: number;
      initiativeBonus?: number;
      initiativeRoll?: number | null;
      stats?: Record<string, unknown>;
      consumables?: components["schemas"]["Consumable"][];
      conditions?: string[];
      status?: components["schemas"]["EntryStatus"];
      notes?: string;
    };
    Consumable: {
      _id: components["schemas"]["ObjectId"];
      name: string;
      maxUses: number;
      currentUses: number;
      resetOn: components["schemas"]["ConsumableResetOn"];
      notes: string;
      createdAt: components["schemas"]["DateTime"];
      updatedAt: components["schemas"]["DateTime"];
    };
    CreateConsumableRequest: {
      name: string;
      maxUses: number;
      currentUses: number;
      resetOn?: components["schemas"]["ConsumableResetOn"];
      notes?: string;
    };
    UpdateConsumableRequest: {
      name?: string;
      maxUses?: number;
      currentUses?: number;
      resetOn?: components["schemas"]["ConsumableResetOn"];
      notes?: string;
    };
    RollInitiativeRequest: {
      rollsByEntryId?: Record<string, number>;
    };
    UpdateCurrentTurnRequest: {
      currentTurnIndex?: number;
      entryId?: components["schemas"]["ObjectId"];
      round?: number;
    };
    TurnResponse: {
      encounter: components["schemas"]["Encounter"];
      currentEntry: components["schemas"]["InitiativeEntry"] | null;
    };
    EntryMutationResponse: {
      entry: components["schemas"]["InitiativeEntry"];
      encounter: components["schemas"]["Encounter"];
    };
    ConsumableMutationResponse: {
      consumable: components["schemas"]["Consumable"];
      entry: components["schemas"]["InitiativeEntry"];
      encounter: components["schemas"]["Encounter"];
    };
  };
  responses: never;
  parameters: never;
  requestBodies: never;
  headers: never;
  pathItems: never;
}
