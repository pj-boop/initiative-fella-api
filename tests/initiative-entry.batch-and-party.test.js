import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { createApp } from "../src/app.js";
import { closeTestDb, clearTestDb, connectTestDb } from "./helpers/testDb.js";
import { createCampaign, createCharacter, createCustomEntry, createEncounter, registerUser } from "./helpers/apiFactory.js";

let app;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-secret";
  await connectTestDb();
  app = createApp();
});

beforeEach(async () => clearTestDb());
afterAll(async () => closeTestDb());

describe("initiative entry batch and party routes", () => {
  test("batch routes update all entries and validate non-empty ids", async () => {
    const { token } = await registerUser(app);
    const campaign = await createCampaign(app, token);
    await createCharacter(app, token, campaign._id, { name: "Player One" });
    const encounter = await createEncounter(app, token, campaign._id);

    const entryA = await createCustomEntry(app, token, encounter._id, { name: "A", maxHp: 15, currentHp: 15 });
    const entryB = await createCustomEntry(app, token, encounter._id, { name: "B", maxHp: 12, currentHp: 12 });

    await request(app)
      .post(`/api/encounters/${encounter._id}/entries/batch/damage`)
      .set("Authorization", `Bearer ${token}`)
      .send({ entryIds: [entryA._id, entryB._id], amount: 4 })
      .expect(200);

    let refreshed = await request(app).get(`/api/encounters/${encounter._id}`).set("Authorization", `Bearer ${token}`).expect(200);
    expect(refreshed.body.entries.find((entry) => entry._id === entryA._id).currentHp).toBe(11);
    expect(refreshed.body.entries.find((entry) => entry._id === entryB._id).currentHp).toBe(8);

    await request(app)
      .post(`/api/encounters/${encounter._id}/entries/batch/heal`)
      .set("Authorization", `Bearer ${token}`)
      .send({ entryIds: [entryA._id, entryB._id], amount: 2 })
      .expect(200);

    await request(app)
      .post(`/api/encounters/${encounter._id}/entries/batch/temp-hp`)
      .set("Authorization", `Bearer ${token}`)
      .send({ entryIds: [entryA._id, entryB._id], amount: 5 })
      .expect(200);

    await request(app)
      .post(`/api/encounters/${encounter._id}/entries/batch/conditions`)
      .set("Authorization", `Bearer ${token}`)
      .send({ entryIds: [entryA._id, entryB._id], condition: "poisoned", action: "add" })
      .expect(200);

    refreshed = await request(app).get(`/api/encounters/${encounter._id}`).set("Authorization", `Bearer ${token}`).expect(200);
    const afterA = refreshed.body.entries.find((entry) => entry._id === entryA._id);
    const afterB = refreshed.body.entries.find((entry) => entry._id === entryB._id);
    expect(afterA.currentHp).toBe(13);
    expect(afterB.currentHp).toBe(10);
    expect(afterA.tempHp).toBe(5);
    expect(afterB.tempHp).toBe(5);
    expect(afterA.conditions).toContain("poisoned");
    expect(afterB.conditions).toContain("poisoned");

    const invalid = await request(app)
      .post(`/api/encounters/${encounter._id}/entries/batch/damage`)
      .set("Authorization", `Bearer ${token}`)
      .send({ entryIds: [], amount: 1 })
      .expect(400);

    expect(invalid.body.message).toBe("entryIds must be a non-empty array");
  });

  test("from-character and from-party are deduplicated/idempotent", async () => {
    const { token } = await registerUser(app);
    const campaign = await createCampaign(app, token);
    const p1 = await createCharacter(app, token, campaign._id, { name: "Player One" });
    const p2 = await createCharacter(app, token, campaign._id, { name: "Player Two" });

    await request(app).post(`/api/campaigns/${campaign._id}/party/${p1._id}`).set("Authorization", `Bearer ${token}`).expect(200);
    await request(app).post(`/api/campaigns/${campaign._id}/party/${p2._id}`).set("Authorization", `Bearer ${token}`).expect(200);

    const encounter = await createEncounter(app, token, campaign._id);

    await request(app)
      .post(`/api/encounters/${encounter._id}/entries/from-character`)
      .set("Authorization", `Bearer ${token}`)
      .send({ characterId: p1._id })
      .expect(201);

    const duplicate = await request(app)
      .post(`/api/encounters/${encounter._id}/entries/from-character`)
      .set("Authorization", `Bearer ${token}`)
      .send({ characterId: p1._id })
      .expect(400);
    expect(duplicate.body.message).toBe("Player character is already in this encounter");

    let partyAdd = await request(app)
      .post(`/api/encounters/${encounter._id}/entries/from-party`)
      .set("Authorization", `Bearer ${token}`)
      .expect(201);
    expect(partyAdd.body.entries).toHaveLength(1);

    partyAdd = await request(app)
      .post(`/api/encounters/${encounter._id}/entries/from-party`)
      .set("Authorization", `Bearer ${token}`)
      .expect(201);
    expect(partyAdd.body.entries).toHaveLength(0);
  });
});
