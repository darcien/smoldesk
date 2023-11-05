import { Db, DbUnavailability } from "./db_utils.ts";
import { TimeRange } from "./request_utils.ts";

export function formatTimeRange(timeRange: TimeRange) {
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

function getFirstName(
  { users = {}, userId }: { users: Db["users"]; userId: string },
) {
  return users[userId]?.name.split(" ")[0] || "<no name>";
}

export function formatUnavailabilityMessage(
  { users, unavailability }: {
    users: Db["users"];
    unavailability: DbUnavailability;
  },
) {
  const firstName = getFirstName({ users, userId: unavailability.userId });
  const formattedUnavailTime = formatTimeRange(unavailability.unavailableTime);
  switch (unavailability.availability) {
    case "onSickLeave":
      return `😷 ${firstName} will be on sick leave today ${formattedUnavailTime}.`;
    case "onPto":
      return `🏝️ ${firstName} will be unavailable today ${formattedUnavailTime}.`;
    default:
      return `🧨 ${firstName} will be missing today ${formattedUnavailTime}. (debug: ${unavailability.availability})`;
  }
}

// TODO: reimplement this
// const addedPtoMessages = addedPtos.map((addedPto) =>
//   `✅ PTO approved for ${
//     getFirstName({ userId: addedPto.userId })
//   }, happening ${
//     formatDateForDiscord(new Date(addedPto.requestDate), "relative")
//   } for ${addedPto.totalDay} day(s).`
// );

export function formatDateForDiscord(
  date: Date,
  format: "relative" | "short date",
) {
  const discordFormat = format === "relative" ? "R" : "d";
  return `<t:${Math.floor(date.getTime() / 1000)}:${discordFormat}>`;
}
