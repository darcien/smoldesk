import { PtoRequest, UserId, UserWithRequests } from "./request_utils.ts";
import { parse } from "./deps.ts";

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

const flags = parse(Deno.args, {
  boolean: ["dry-run"],
});

const dryRun = flags["dry-run"];

export async function getDb() {
  let db: Db = {};

  try {
    db = JSON.parse(await Deno.readTextFile("./db.json")) || {};
  } catch {
    // ignore for now
    console.log("⚠️ ./db.json not found, proceeding with empty db...");
  }
  return db;
}

export async function saveDb(db: Db) {
  if (dryRun) {
    console.log("📝 dry run, not saving db...");
    return db;
  }
  await Deno.writeTextFile(
    "./db.json",
    JSON.stringify(db),
  );
  return db;
}
