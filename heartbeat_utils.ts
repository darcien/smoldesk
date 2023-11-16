import { EnvConfig } from "./config_utils.ts";

/**
 * Search params for push monitor type
 * https://github.com/louislam/uptime-kuma/issues/279#issuecomment-1356352436
 */
type UptimeKumaHeartbeat = {
  status?: "up" | "down";
  msg: string;
  ping?: number;
};

// TODO: make heartbeat respect dry run
// TODO: dont fail if heartbeat fails
export async function sendHeartbeat(
  envConfig: EnvConfig,
  { status = "up", msg, ping }: UptimeKumaHeartbeat,
) {
  const params = new URLSearchParams({
    status,
    msg,
    ...(typeof ping === "number" ? { ping: String(ping) } : null),
  });
  await fetch(`${envConfig.UPTIME_KUMA_HEARTBEAT_URL}?${params.toString()}`);
}
