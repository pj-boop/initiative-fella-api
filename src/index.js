import "dotenv/config";
import job from "./lib/cron.js";
import { createApp } from "./app.js";
import { connectDB } from "./lib/db.js";

const requiredEnv = ["MONGO_URI", "JWT_SECRET"];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const PORT = process.env.PORT || 3000;
const app = createApp();

if (process.env.NODE_ENV === "production") {
  job.start();
}

try {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
} catch (error) {
  console.error("Failed to start server", error);
  process.exit(1);
}