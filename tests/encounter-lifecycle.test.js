import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { createApp } from "../src/app.js";
import { closeTestDb, clearTestDb, connectTestDb } from "./helpers/testDb.js";
import { createCampaign, createCharacter, registerUser } from "./helpers/apiFactory.js";

let app;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-secret";
  await connectTestDb();
  app = createApp();
});

beforeEach(async () => clearTestDb());
afterAll(async () => closeTestDb());

describe("encounter lifecycle", () => {
  test("battle flow and completed lock", async () => {
    const { token } = await registerUser(app);
    const campaign = await createCampaign(app, token);

    const hero = await createCharacter(app, token, campaign._id, { name: "Hero", initiativeBonus: 2 });
    const scout = await createCharacter(app, token, campaign._id, { name: "Scout", initiativeBonus: 3 });

    await request(app).post(`/api/campaigns/${campaign._id}/party/${hero._id}`).set("Authorization", `Bearer ${token}`).expect(200);
    await request(app).post(`/api/campaigns/${campaign._id}/party/${scout._id}`).set("Authorization", `Bearer ${token}`).expect(200);

    const encounter = await request(app)
      .post("/api/encounters")
      .set("Authorization", `Bearer ${token}`)
      .send({ campaignId: campaign._id, name: "Battle", autoAddParty: true })
      .expect(201);

    const entries = encounter.body.entries;
    expect(entries).toHaveLength(2);

    const heroEntry = entries.find((entry) => entry.character?.toString() === hero._id);
    const scoutEntry = entries.find((entry) => entry.character?.toString() === scout._id);

    let response = await request(app)
      .post(`/api/encounters/${encounter.body._id}/roll-initiative`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        rollsByEntryId: {
          [heroEntry._id]: 11,
          [scoutEntry._id]: 9,
        },
      })
      .expect(200);

    expect(response.body.turnOrder).toHaveLength(2);

    response = await request(app)
      .post(`/api/encounters/${encounter.body._id}/start`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.currentTurnIndex).toBe(0);
    expect(response.body.round).toBe(1);

    response = await request(app)
      .post(`/api/encounters/${encounter.body._id}/turns/next`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(response.body.currentTurnIndex).toBe(1);

    response = await request(app)
      .post(`/api/encounters/${encounter.body._id}/turns/previous`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    expect(response.body.currentTurnIndex).toBe(0);

    response = await request(app)
      .patch(`/api/encounters/${encounter.body._id}/turns/current`)
      .set("Authorization", `Bearer ${token}`)
      .send({ entryId: scoutEntry._id })
      .expect(200);
    expect(response.body.currentTurnIndex).toBe(1);

    response = await request(app)
      .patch(`/api/encounters/${encounter.body._id}/turns/current`)
      .set("Authorization", `Bearer ${token}`)
      .send({ currentTurnIndex: 0 })
      .expect(200);
    expect(response.body.currentTurnIndex).toBe(0);

    response = await request(app)
      .post(`/api/encounters/${encounter.body._id}/end`)
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    expect(response.body.status).toBe("completed");

    response = await request(app)
      .post(`/api/encounters/${encounter.body._id}/turns/next`)
      .set("Authorization", `Bearer ${token}`)
      .expect(400);

    expect(response.body.message).toBe("Completed encounters are read-only");
  });
});
