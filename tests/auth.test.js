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

describe("health/auth smoke", () => {
  test("GET /health", async () => {
    const response = await request(app).get("/health").expect(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  test("register success", async () => {
    const response = await request(app).post("/api/auth/register").send({
      username: "tester",
      email: "tester@example.com",
      password: "password123",
    }).expect(201);

    expect(response.body.token).toBeTypeOf("string");
    expect(response.body.user.email).toBe("tester@example.com");
  });

  test("register duplicate email", async () => {
    const payload = {
      username: "tester",
      email: "tester@example.com",
      password: "password123",
    };

    await request(app).post("/api/auth/register").send(payload).expect(201);

    const response = await request(app).post("/api/auth/register").send({
      ...payload,
      username: "tester-2",
    }).expect(400);

    expect(response.body.message).toBe("Email already exists");
  });

  test("login success", async () => {
    await request(app).post("/api/auth/register").send({
      username: "tester",
      email: "tester@example.com",
      password: "password123",
    }).expect(201);

    const response = await request(app).post("/api/auth/login").send({
      email: "tester@example.com",
      password: "password123",
    }).expect(200);

    expect(response.body.token).toBeTypeOf("string");
    expect(response.body.user.username).toBe("tester");
  });

  test("login wrong password", async () => {
    await request(app).post("/api/auth/register").send({
      username: "tester",
      email: "tester@example.com",
      password: "password123",
    }).expect(201);

    const response = await request(app).post("/api/auth/login").send({
      email: "tester@example.com",
      password: "wrong-password",
    }).expect(400);

    expect(response.body.message).toBe("Invalid credentials");
  });

  test("protected route without token returns 401", async () => {
    await request(app).get("/api/campaigns").expect(401);
  });
});
