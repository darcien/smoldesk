import { RuntimeConfig } from "./config_utils.ts";
import { logger } from "./logger_utils.ts";
import { PtoRequest, UserId, UserWithRequests } from "./request_utils.ts";

export type DbUser = Pick<UserWithRequests, "id" | "name">;

export type DbPto = PtoRequest & {
  userId: UserId;
};

export type DbUnavailability =
  & Pick<UserWithRequests, "availability" | "unavailableTime">
  & {
    userId: UserId;
  };

export type Db = {
  users?: { [userId: string]: DbUser };
  ptos?: { [ptoRequestId: string]: DbPto };
  unavailabilities?: { [unavailabilityId: string]: DbUnavailability };
};

export async function getDb(): Promise<Db> {
  try {
    return JSON.parse(await Deno.readTextFile("./db.json")) || {};
  } catch {
    // ignore for now
    logger().info("./db.json not found, proceeding with empty db");
    return {};
  }
}

export async function saveDb(runtimeConfig: RuntimeConfig, newDb: Db) {
  if (runtimeConfig.dryRun) {
    logger().info("Running in dry run mode, changes not persisted");
    return newDb;
  }

  logger().info("Persisting changes to disk...");
  await Deno.writeTextFile(
    "./db.json",
    JSON.stringify(newDb),
  );
  return newDb;
}
