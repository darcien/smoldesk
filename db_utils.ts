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

let db: Db = {};

try {
  db = JSON.parse(await Deno.readTextFile("./db.json")) || {};
} catch {
  // ignore for now
}

export function getDb() {
  return db;
}
