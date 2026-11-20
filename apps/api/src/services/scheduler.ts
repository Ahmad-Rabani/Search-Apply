import { runScheduledAgents } from "./agent.js";

let timer: NodeJS.Timeout | null = null;
let lastHourChecked = -1;

/** Lightweight hourly scheduler (no Redis required). */
export function startAgentScheduler() {
  if (timer) return;

  const tick = async () => {
    const hour = new Date().getUTCHours();
    if (hour === lastHourChecked) return;
    lastHourChecked = hour;
    try {
      const results = await runScheduledAgents();
      if (results.length) {
        console.log(`[scheduler] hour=${hour} ran ${results.length} agent(s)`);
      }
    } catch (err) {
      console.error("[scheduler]", err);
    }
  };

  void tick();
  timer = setInterval(() => {
    void tick();
  }, 60 * 1000);
}

export function stopAgentScheduler() {
  if (timer) clearInterval(timer);
  timer = null;
}
