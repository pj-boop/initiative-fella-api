import request from "supertest";

export const registerUser = async (app, overrides = {}) => {
  const defaults = {
    username: "user1",
    email: "user1@example.com",
    password: "password123",
  };
  const body = { ...defaults, ...overrides };
  const response = await request(app).post("/api/auth/register").send(body).expect(201);
  return response.body;
};

export const createCampaign = async (app, token, overrides = {}) => {
  const response = await request(app)
    .post("/api/campaigns")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Campaign", ...overrides })
    .expect(201);
  return response.body;
};

export const createCharacter = async (app, token, campaignId, overrides = {}) => {
  const response = await request(app)
    .post("/api/characters")
    .set("Authorization", `Bearer ${token}`)
    .send({
      campaignId,
      name: "Hero",
      type: "player",
      level: 1,
      maxHp: 20,
      armorClass: 14,
      initiativeBonus: 2,
      ...overrides,
    })
    .expect(201);
  return response.body;
};

export const createEncounter = async (app, token, campaignId, overrides = {}) => {
  const response = await request(app)
    .post("/api/encounters")
    .set("Authorization", `Bearer ${token}`)
    .send({ campaignId, name: "Encounter", ...overrides })
    .expect(201);
  return response.body;
};

export const createCustomEntry = async (app, token, encounterId, overrides = {}) => {
  const response = await request(app)
    .post(`/api/encounters/${encounterId}/entries/custom`)
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Custom Entry", type: "monster", maxHp: 12, armorClass: 12, initiativeBonus: 1, ...overrides })
    .expect(201);
  return response.body.entry;
};
