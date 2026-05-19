import express from "express";
import cors from "cors";

import authRoutes from "./routes/authRoutes.js";
import campaignRoutes from "./routes/campaignRoutes.js";
import characterRoutes from "./routes/characterRoutes.js";
import encounterRoutes from "./routes/encounterRoutes.js";
import initiativeEntryRoutes from "./routes/initiativeEntryRoutes.js";
import publicLevelUpRoutes from "./routes/publicLevelUpRoutes.js";

import protectRoute from "./middleware/auth.middleware.js";

export const createApp = () => {
  const app = express();

  const allowedOrigins = [
    process.env.CLIENT_URL,
    process.env.PUBLIC_WEB_APP_URL,
    "http://localhost:5173",
    "http://localhost:8081",
  ].filter(Boolean);

  const corsOptions = {
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
  };

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

  return app;
};