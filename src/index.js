import express from "express";
import cors from "cors";
import "dotenv/config";
// import job from "./lib/cron.js";

import authRoutes from "./routes/authRoutes.js";
import campaignRoutes from "./routes/campaignRoutes.js";
import characterRoutes from "./routes/characterRoutes.js";
import encounterRoutes from "./routes/encounterRoutes.js";
import initiativeEntryRoutes from "./routes/initiativeEntryRoutes.js";
import publicLevelUpRoutes from "./routes/publicLevelUpRoutes.js";

import protectRoute from "./middleware/auth.middleware.js";

import { connectDB } from "./lib/db.js";

const requiredEnv = ["MONGO_URI", "JWT_SECRET"];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions =
  process.env.NODE_ENV === "production"
    ? { origin: process.env.CLIENT_URL }
    : { origin: "http://localhost:5173" };

// If the frontend uses cookies in the future, add `credentials: true` here
// and send matching credentials from frontend requests.
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/public/level-up-sessions", publicLevelUpRoutes);

app.use("/api/campaigns", protectRoute, campaignRoutes);
app.use("/api/characters", protectRoute, characterRoutes);
app.use("/api/encounters/:encounterId/entries", protectRoute, initiativeEntryRoutes);
app.use("/api/encounters", protectRoute, encounterRoutes);

app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use((error, req, res, next) => {
  console.error(error);

  if (error.name === "ValidationError") {
    return res.status(400).json({ message: error.message });
  }

  return res.status(500).json({ message: "Internal server error" });
});

// if (process.env.NODE_ENV === "production") {
//   job.start();
// }

try {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} catch (error) {
  console.error("Failed to start server", error);
  process.exit(1);
}
