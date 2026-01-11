import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Update time-based platform stats (24h stats and active workspaces) every 15 minutes
// These require scanning data, so we update them periodically rather than in real-time
crons.interval(
  "update platform stats time-based",
  { minutes: 15 },
  internal.payments.updatePlatformStatsTimeBased
);

export default crons;
