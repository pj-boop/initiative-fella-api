import request from "supertest";
import { beforeAll, beforeEach, afterAll, describe, expect, test } from "vitest";

import { createApp } from "../src/app.js";
import { connectTestDb, clearTestDb, closeTestDb } from "./helpers/testDb.js";

let app;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-secret";

  await connectTestDb();
  app = createApp();
});

beforeEach(async () => {
  await clearTestDb();
});

afterAll(async () => {
  await closeTestDb();
});

const createAuthedUser = async () => {
  const response = await request(app)
    .post("/api/auth/register")
    .send({
      username: "tester",
      email: "tester@example.com",
      password: "password123",
    })
    .expect(201);

  return response.body.token;
};

const createCampaign = async (token) => {
  const response = await request(app)
    .post("/api/campaigns")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "Test Campaign",
    })
    .expect(201);

  return response.body;
};

const createCharacter = async (token, campaignId) => {
  const response = await request(app)
    .post("/api/characters")
    .set("Authorization", `Bearer ${token}`)
    .send({
      campaignId,
      name: "Test Hero",
      type: "player",
      level: 1,
      maxHp: 20,
      armorClass: 14,
      initiativeBonus: 2,
    })
    .expect(201);

  return response.body;
};

const createEncounter = async (token, campaignId) => {
  const response = await request(app)
    .post("/api/encounters")
    .set("Authorization", `Bearer ${token}`)
    .send({
      campaignId,
      name: "Test Encounter",
    })
    .expect(201);

  return response.body;
};

const createEntry = async (token, encounterId) => {
  const response = await request(app)
    .post(`/api/encounters/${encounterId}/entries/custom`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "Goblin",
      type: "monster",
      maxHp: 12,
      armorClass: 13,
      initiativeBonus: 1,
    })
    .expect(201);

  return response.body.entry;
};

const addConsumable = async (token, encounterId, entryId) => {
  const response = await request(app)
    .post(`/api/encounters/${encounterId}/entries/${entryId}/consumables`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "Potion",
      maxUses: 3,
      currentUses: 3,
      resetOn: "never",
    })
    .expect(201);

  return response.body.consumable;
};

describe("initiative entry consumables", () => {
  test("rejects invalid maxUses when updating a consumable", async () => {
    const token = await createAuthedUser();
    const campaign = await createCampaign(token);

    await createCharacter(token, campaign._id);

    const encounter = await createEncounter(token, campaign._id);
    const entry = await createEntry(token, encounter._id);
    const consumable = await addConsumable(token, encounter._id, entry._id);

    const response = await request(app)
      .patch(`/api/encounters/${encounter._id}/entries/${entry._id}/consumables/${consumable._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        maxUses: "nope",
      })
      .expect(400);

    expect(response.body.message).toBe("maxUses must be a non-negative integer");
  });

  test("rejects currentUses greater than maxUses", async () => {
    const token = await createAuthedUser();
    const campaign = await createCampaign(token);

    await createCharacter(token, campaign._id);

    const encounter = await createEncounter(token, campaign._id);
    const entry = await createEntry(token, encounter._id);
    const consumable = await addConsumable(token, encounter._id, entry._id);

    const response = await request(app)
      .patch(`/api/encounters/${encounter._id}/entries/${entry._id}/consumables/${consumable._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        maxUses: 2,
        currentUses: 3,
      })
      .expect(400);

    expect(response.body.message).toBe("currentUses cannot exceed maxUses");
  });

  test("updates maxUses and currentUses when values are valid numeric strings", async () => {
    const token = await createAuthedUser();
    const campaign = await createCampaign(token);

    await createCharacter(token, campaign._id);

    const encounter = await createEncounter(token, campaign._id);
    const entry = await createEntry(token, encounter._id);
    const consumable = await addConsumable(token, encounter._id, entry._id);

    const response = await request(app)
      .patch(`/api/encounters/${encounter._id}/entries/${entry._id}/consumables/${consumable._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        maxUses: "5",
        currentUses: "4",
      })
      .expect(200);

    expect(response.body.consumable.maxUses).toBe(5);
    expect(response.body.consumable.currentUses).toBe(4);
  });
});