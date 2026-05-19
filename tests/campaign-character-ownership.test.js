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

beforeEach(async () => await clearTestDb());
afterAll(async () => await closeTestDb());

const register = async (username, email) => (await request(app).post("/api/auth/register").send({ username, email, password: "password123" }).expect(201)).body.token;
const createCampaign = async (token, name) => (await request(app).post("/api/campaigns").set("Authorization", `Bearer ${token}`).send({ name }).expect(201)).body;
const createCharacter = async (token, campaignId, name, type = "player") => (await request(app).post("/api/characters").set("Authorization", `Bearer ${token}`).send({ campaignId, name, type, level: 1, maxHp: 20, armorClass: 14, initiativeBonus: 2 }).expect(201)).body;

describe("campaign/character ownership", () => {
  test("user A cannot access user B campaign", async () => {
    const tokenA = await register("userA", "a@example.com");
    const tokenB = await register("userB", "b@example.com");

    const campaignB = await createCampaign(tokenB, "B Campaign");
    await request(app).get(`/api/campaigns/${campaignB._id}`).set("Authorization", `Bearer ${tokenA}`).expect(404);
  });

  test("user A cannot add user B character to an encounter", async () => {
    const tokenA = await register("userA", "a@example.com");
    const tokenB = await register("userB", "b@example.com");

    const campaignA = await createCampaign(tokenA, "A Campaign");
    const campaignB = await createCampaign(tokenB, "B Campaign");
    await createCharacter(tokenA, campaignA._id, "A Hero");
    const characterB = await createCharacter(tokenB, campaignB._id, "B Hero");

    const encounterA = (await request(app).post("/api/encounters").set("Authorization", `Bearer ${tokenA}`).send({ campaignId: campaignA._id, name: "Fight" }).expect(201)).body;

    const response = await request(app)
      .post(`/api/encounters/${encounterA._id}/entries/from-character`)
      .set("Authorization", `Bearer ${tokenA}`)
      .send({ characterId: characterB._id })
      .expect(404);

    expect(response.body.message).toBe("Character not found");
  });

  test("default party only accepts players and does not duplicate ids", async () => {
    const token = await register("userA", "a@example.com");
    const campaign = await createCampaign(token, "Party Campaign");
    const player = await createCharacter(token, campaign._id, "Player", "player");
    const monster = await createCharacter(token, campaign._id, "Monster", "monster");

    let response = await request(app)
      .post(`/api/campaigns/${campaign._id}/party/${monster._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(400);
    expect(response.body.message).toBe("Campaign main party can only contain player characters");

    response = await request(app)
      .post(`/api/campaigns/${campaign._id}/party/${player._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(response.body.defaultPartyCharacterIds).toHaveLength(1);

    response = await request(app)
      .post(`/api/campaigns/${campaign._id}/party/${player._id}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(response.body.defaultPartyCharacterIds).toHaveLength(1);
  });
});
