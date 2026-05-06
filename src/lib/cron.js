import { CronJob } from "cron";

const job = new CronJob("*/14 * * * *", async () => {
  if (!process.env.API_URL) return;

  try {
    const response = await fetch(process.env.API_URL);
    console.log(`Keep-alive ping completed with status ${response.status}`);
  } catch (error) {
    console.log("Keep-alive ping failed", error.message);
  }
});

export default job;
