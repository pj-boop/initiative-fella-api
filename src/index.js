import express from "express";
import cors from "cors";
import "dotenv/config";
// import job from "./lib/cron.js";

import authRoutes from "./routes/authRoutes.js";
import characterRoutes from "./routes/characterRoutes.js";
import encounterRoutes from "./routes/encounterRoutes.js";
import initiativeEntryRoutes from "./routes/initiativeEntryRoutes.js";

import protectRoute from "./middleware/auth.middleware.js";

import { connectDB } from "./lib/db.js";

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api/auth", authRoutes);

app.use("/api/characters", protectRoute, characterRoutes);
app.use("/api/encounters/:encounterId/entries", protectRoute, initiativeEntryRoutes);
app.use("/api/encounters", protectRoute, encounterRoutes);

app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

if (process.env.NODE_ENV === "production") {
  job.start();
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  connectDB();
});
