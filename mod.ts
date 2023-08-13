import { formatInTimeZone } from "https://esm.sh/date-fns-tz@2.0.0";
import {
  blastMessageToAllWebooks,
  formatDateForDiscord,
} from "./discord_utils.ts";
import { fetchUserAvailability, TimeRange } from "./request_utils.ts";
import { Db, getDb } from "./db_utils.ts";

const userAvailability = await fetchUserAvailability();

const availableUsers = userAvailability.available;
const unavailableUsers = userAvailability.unavailable;

const db = getDb();
const users = { ...db.users };
const ptos = { ...db.ptos };
const unavailabilities = { ...db.unavailabilities };

for (const user of availableUsers) {
  users[user.id] = {
    id: user.id,
    name: user.name,
  };

  for (const pto of user.ptoRequests) {
    ptos[pto.id] = {
      ...pto,
      userId: user.id,
    };
  }
}
const separator = "|";
function makeUnavailabilityId(
  { userId, today }: { userId: string; today: Date },
) {
  const formattedDate = formatInTimeZone(today, "Asia/Jakarta", "yyyy-MM-dd");
  return [userId, formattedDate].join(separator);
}

for (const user of unavailableUsers) {
  users[user.id] = {
    id: user.id,
    name: user.name,
  };

  const unavailabilityId = makeUnavailabilityId({
    userId: user.id,
    today: new Date(),
  });
  unavailabilities[unavailabilityId] = {
    userId: user.id,
    availability: user.availability,
    unavailableTime: user.unavailableTime,
  };
}

const addedPtos = Object.values(ptos).filter((pto) => !db.ptos?.[pto.id]);
const removedPtos = Object.values(db.ptos || {}).filter((pto) => !ptos[pto.id]);
const addedUnavailabilities = Object.keys(unavailabilities).filter((
  unavailabilityId,
) => !db.unavailabilities?.[unavailabilityId]).map((unavailabilityId) =>
  unavailabilities[unavailabilityId]
);

function getFirstName({ userId }: { userId: string }) {
  return users[userId]?.name.split(" ")[0] || "<no name>";
}

const addedPtoMessages = addedPtos.map((addedPto) =>
  `🏝️ PTO approved for ${
    getFirstName({ userId: addedPto.userId })
  }, happening in ${
    formatDateForDiscord(new Date(addedPto.requestDate), "relative")
  } for ${addedPto.totalDay} day(s).`
);

function formatTimeRange(timeRange: TimeRange) {
  switch (timeRange) {
    case "FULL_DAY":
      return "for all day";
    case "MORNING":
    case "AFTERNOON":
    case "EVENING":
      return `at ${timeRange.toLowerCase()}`;
    default:
      return `at ${timeRange} (raw)`;
  }
}
const addedUnavailabilityMessages = addedUnavailabilities.map((unavail) =>
  `😷 ${getFirstName({ userId: unavail.userId })} will be unavailable today ${
    formatTimeRange(unavail.unavailableTime)
  }.`
);

const message = [
  ...addedPtoMessages,
  ...addedUnavailabilityMessages,
].join("\n");

await blastMessageToAllWebooks(message);

for (const addedPto of addedPtos) {
  const message = `Added PTO for ${users[addedPto.userId]
    ?.name}: ${addedPto.requestDate} - ${addedPto.endDate}`;
  console.log(message);
}
for (const removedPto of removedPtos) {
  console.log(
    `Removed PTO for ${users[removedPto.userId]
      ?.name}: ${removedPto.requestDate} - ${removedPto.endDate}`,
  );
}
for (const addedUnavailability of addedUnavailabilities) {
  console.log(
    `Added Unavailability for ${users[addedUnavailability.userId]
      ?.name}: ${addedUnavailability.availability} - ${addedUnavailability.unavailableTime}}`,
  );
}

const updatedDb: Db = { users, ptos, unavailabilities };
await Deno.writeTextFile(
  "./db.json",
  JSON.stringify(updatedDb),
);

console.log("Done");
