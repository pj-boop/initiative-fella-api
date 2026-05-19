import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { createApp } from "../src/app.js";
import User from "../src/models/User.js";
import { closeTestDb, clearTestDb, connectTestDb } from "./helpers/testDb.js";
import { registerUser } from "./helpers/apiFactory.js";

let app;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "test-secret";
  await connectTestDb();
  app = createApp();
});

beforeEach(async () => clearTestDb());
afterAll(async () => closeTestDb());

describe("password reset flow", () => {
  test("forgot/reset works and token cannot be reused", async () => {
    await registerUser(app, { username: "authuser", email: "auth@example.com", password: "oldpass123" });

    const forgot = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "auth@example.com" })
      .expect(200);

    expect(forgot.body).toHaveProperty("resetToken");

    await request(app)
      .post("/api/auth/reset-password")
      .send({ token: forgot.body.resetToken, password: "newpass123" })
      .expect(200);

    await request(app)
      .post("/api/auth/login")
      .send({ email: "auth@example.com", password: "oldpass123" })
      .expect(400);

    await request(app)
      .post("/api/auth/login")
      .send({ email: "auth@example.com", password: "newpass123" })
      .expect(200);

    const reused = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: forgot.body.resetToken, password: "another123" })
      .expect(400);
    expect(reused.body.message).toBe("Invalid or expired reset token");

    const invalid = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "not-valid", password: "another123" })
      .expect(400);
    expect(invalid.body.message).toBe("Invalid or expired reset token");
  });

  test("expired reset token fails", async () => {
    await registerUser(app, { username: "authuser2", email: "auth2@example.com", password: "oldpass123" });

    const forgot = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "auth2@example.com" })
      .expect(200);

    await User.updateOne({ email: "auth2@example.com" }, { $set: { resetPasswordExpiresAt: new Date(Date.now() - 1000) } });

    const expired = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: forgot.body.resetToken, password: "newpass123" })
      .expect(400);

    expect(expired.body.message).toBe("Invalid or expired reset token");
  });
});
