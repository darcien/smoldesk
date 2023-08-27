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

export async function getDb() {
  let db: Db = {};

  try {
    db = JSON.parse(await Deno.readTextFile("./db.json")) || {};
  } catch {
    // ignore for now
    console.log("Failed to load db.json...");
  }
  return db;
}

export async function saveDb(db: Db) {
  await Deno.writeTextFile(
    "./db.json",
    JSON.stringify(db),
  );
  return db;
}
