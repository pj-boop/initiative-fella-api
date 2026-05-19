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

const register = async () => (await request(app).post("/api/auth/register").send({ username: "owner", email: "owner@example.com", password: "password123" }).expect(201)).body.token;
const createCampaign = async (token) => (await request(app).post("/api/campaigns").set("Authorization", `Bearer ${token}`).send({ name: "Campaign" }).expect(201)).body;
const createCharacter = async (token, campaignId, name, level = 1) => (await request(app).post("/api/characters").set("Authorization", `Bearer ${token}`).send({ campaignId, name, type: "player", level, maxHp: 20, armorClass: 14, initiativeBonus: 2 }).expect(201)).body;


describe("level-up session flow", () => {
  test("open/fetch/submit/review/regenerate/accept-all flow", async () => {
    const token = await register();
    const campaign = await createCampaign(token);
    const alice = await createCharacter(token, campaign._id, "Alice", 1);
    const bob = await createCharacter(token, campaign._id, "Bob", 1);

    await request(app).post(`/api/campaigns/${campaign._id}/party/${alice._id}`).set("Authorization", `Bearer ${token}`).expect(200);
    await request(app).post(`/api/campaigns/${campaign._id}/party/${bob._id}`).set("Authorization", `Bearer ${token}`).expect(200);

    let response = await request(app)
      .post(`/api/campaigns/${campaign._id}/level-up-sessions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Level 2", targetLevel: 2 })
      .expect(201);

    const sessionId = response.body.sessionId;
    const token1 = response.body.publicToken;

    response = await request(app).get(`/api/public/level-up-sessions/${token1}`).expect(200);
    expect(response.body.characters).toHaveLength(2);

    await request(app)
      .post(`/api/public/level-up-sessions/${token1}/characters/${alice._id}/submissions`)
      .send({ patch: { level: 2, maxHp: 25 }, submittedByName: "Alice Player" })
      .expect(200);

    response = await request(app)
      .get(`/api/campaigns/${campaign._id}/level-up-sessions/${sessionId}`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body).toHaveProperty("session");
    expect(response.body).toHaveProperty("submissions");
    expect(response.body).toHaveProperty("missingCharacters");
    expect(response.body.missingCharacters).toContainEqual(expect.objectContaining({ id: bob._id, name: "Bob" }));

    response = await request(app)
      .post(`/api/campaigns/${campaign._id}/level-up-sessions/${sessionId}/regenerate-link`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const token2 = response.body.publicToken;
    expect(token2).not.toBe(token1);

    await request(app).get(`/api/public/level-up-sessions/${token1}`).expect(404);

    await request(app)
      .post(`/api/public/level-up-sessions/${token2}/characters/${bob._id}/submissions`)
      .send({ patch: { level: 2 }, submittedByName: "Bob Player" })
      .expect(200);

    response = await request(app)
      .post(`/api/campaigns/${campaign._id}/level-up-sessions/${sessionId}/accept-all`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.acceptedCount).toBe(2);

    const updatedAlice = (await request(app).get(`/api/characters/${alice._id}`).set("Authorization", `Bearer ${token}`).expect(200)).body;
    expect(updatedAlice.level).toBe(2);
    expect(updatedAlice.maxHp).toBe(25);
  });

  test("discard all leaves character unchanged", async () => {
    const token = await register();
    const campaign = await createCampaign(token);
    const charlie = await createCharacter(token, campaign._id, "Charlie", 3);

    await request(app).post(`/api/campaigns/${campaign._id}/party/${charlie._id}`).set("Authorization", `Bearer ${token}`).expect(200);

    const created = await request(app)
      .post(`/api/campaigns/${campaign._id}/level-up-sessions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Level 4", targetLevel: 4 })
      .expect(201);

    await request(app)
      .post(`/api/public/level-up-sessions/${created.body.publicToken}/characters/${charlie._id}/submissions`)
      .send({ patch: { level: 4, maxHp: 30 } })
      .expect(200);

    await request(app)
      .post(`/api/campaigns/${campaign._id}/level-up-sessions/${created.body.sessionId}/discard-all`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    const unchanged = (await request(app).get(`/api/characters/${charlie._id}`).set("Authorization", `Bearer ${token}`).expect(200)).body;
    expect(unchanged.level).toBe(3);
    expect(unchanged.maxHp).toBe(20);
  });
});
