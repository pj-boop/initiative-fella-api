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

const createAuthedUser = async () => (await request(app).post("/api/auth/register").send({ username: "user1", email: "u@example.com", password: "password123" }).expect(201)).body.token;

const createCampaign = async (token) => (await request(app).post("/api/campaigns").set("Authorization", `Bearer ${token}`).send({ name: "Campaign" }).expect(201)).body;
const createCharacter = async (token, campaignId) => (await request(app).post("/api/characters").set("Authorization", `Bearer ${token}`).send({ campaignId, name: "Hero", type: "player", level: 1, maxHp: 20, armorClass: 15, initiativeBonus: 2 }).expect(201)).body;
const createEncounter = async (token, campaignId) => (await request(app).post("/api/encounters").set("Authorization", `Bearer ${token}`).send({ campaignId, name: "Encounter" }).expect(201)).body;

describe("initiative entry regressions", () => {
  test("custom entry hp/conditions routes and completed lock", async () => {
    const token = await createAuthedUser();
    const campaign = await createCampaign(token);
    await createCharacter(token, campaign._id);
    const encounter = await createEncounter(token, campaign._id);

    const addResponse = await request(app)
      .post(`/api/encounters/${encounter._id}/entries/custom`)
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Goblin", type: "monster", maxHp: 15, armorClass: 12, initiativeBonus: 1 })
      .expect(201);

    const entryId = addResponse.body.entry._id;
    expect(addResponse.body.entry.name).toBe("Goblin");

    let response = await request(app)
      .post(`/api/encounters/${encounter._id}/entries/${entryId}/damage`)
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 6 })
      .expect(200);
    expect(response.body.entry.currentHp).toBe(9);

    response = await request(app)
      .post(`/api/encounters/${encounter._id}/entries/${entryId}/heal`)
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 3 })
      .expect(200);
    expect(response.body.entry.currentHp).toBe(12);

    response = await request(app)
      .post(`/api/encounters/${encounter._id}/entries/${entryId}/temp-hp`)
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 5 })
      .expect(200);
    expect(response.body.entry.tempHp).toBe(5);

    response = await request(app)
      .post(`/api/encounters/${encounter._id}/entries/${entryId}/conditions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ condition: "poisoned" })
      .expect(200);
    expect(response.body.entry.conditions).toContain("poisoned");

    response = await request(app)
      .delete(`/api/encounters/${encounter._id}/entries/${entryId}/conditions/poisoned`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(response.body.entry.conditions).not.toContain("poisoned");

    await request(app)
      .patch(`/api/encounters/${encounter._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "completed" })
      .expect(200);

    response = await request(app)
      .post(`/api/encounters/${encounter._id}/entries/${entryId}/damage`)
      .set("Authorization", `Bearer ${token}`)
      .send({ amount: 1 })
      .expect(400);

    expect(response.body.message).toBe("Completed encounters are read-only");
  });
});
