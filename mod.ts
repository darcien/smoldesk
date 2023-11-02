import {
  blastMessageToAllWebooks,
  formatDateForDiscord,
} from "./discord_utils.ts";
import { fetchUserAvailability, TimeRange } from "./request_utils.ts";
import { getDb, saveDb } from "./db_utils.ts";
import { toJakartaDate } from "./date_utils.ts";

const { availableUsers, unavailableUsers } = await fetchUserAvailability();

const oldDb = await getDb();
const users = { ...oldDb.users };
const ptos = { ...oldDb.ptos };
const unavailabilities = { ...oldDb.unavailabilities };

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
  { userId }: { userId: string },
) {
  return [userId, toJakartaDate(new Date())].join(separator);
}

for (const user of unavailableUsers) {
  users[user.id] = {
    id: user.id,
    name: user.name,
  };

  const unavailabilityId = makeUnavailabilityId({
    userId: user.id,
  });
  unavailabilities[unavailabilityId] = {
    userId: user.id,
    availability: user.availability,
    unavailableTime: user.unavailableTime,
  };
}

const addedPtos = Object.values(ptos).filter((pto) => !oldDb.ptos?.[pto.id]);
const removedPtos = Object.values(oldDb.ptos || {}).filter((pto) =>
  !ptos[pto.id]
);
const addedUnavailabilities = Object.keys(unavailabilities).filter((
  unavailabilityId,
) => !oldDb.unavailabilities?.[unavailabilityId]).map((unavailabilityId) =>
  unavailabilities[unavailabilityId]
);

function getFirstName({ userId }: { userId: string }) {
  return users[userId]?.name.split(" ")[0] || "<no name>";
}

const addedPtoMessages = addedPtos.map((addedPto) =>
  `✅ PTO approved for ${
    getFirstName({ userId: addedPto.userId })
  }, happening ${
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
const addedUnavailabilityMessages = addedUnavailabilities.map((unavail) => {
  const firstName = getFirstName({ userId: unavail.userId });
  const formattedUnavailTime = formatTimeRange(unavail.unavailableTime);
  switch (unavail.availability) {
    case "onSickLeave":
      return `😷 ${firstName} will be on sick leave today ${formattedUnavailTime}.`;
    case "onPto":
      return `🏝️ ${firstName} will be unavailable today ${formattedUnavailTime}.`;
    default:
      return `🧨 ${firstName} will be missing today ${formattedUnavailTime}. (debug: ${unavail.availability})`;
  }
});

const message = [
  ...addedPtoMessages,
  ...addedUnavailabilityMessages,
].join("\n");

// TODO: Need major refactor to make the initial fetch dont do any filter
// (or filter based on flattened webhooks config),
// iterate over the config to craft the messages and send per webhook URL.
await blastMessageToAllWebooks(message);

for (const addedPto of addedPtos) {
  const message = `Added PTO for ${
    users[addedPto.userId]
      ?.name
  }: ${addedPto.requestDate} - ${addedPto.endDate}`;
  console.log(message);
}
for (const removedPto of removedPtos) {
  console.log(
    `Removed PTO for ${
      users[removedPto.userId]
        ?.name
    }: ${removedPto.requestDate} - ${removedPto.endDate}`,
  );
}
for (const addedUnavailability of addedUnavailabilities) {
  console.log(
    `Added Unavailability for ${
      users[addedUnavailability.userId]
        ?.name
    }: ${addedUnavailability.availability} - ${addedUnavailability.unavailableTime}`,
  );
}

await saveDb({ users, ptos, unavailabilities });

console.log("Done");
