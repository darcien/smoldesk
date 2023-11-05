import { toJakartaDate } from "./date_utils.ts";
import { DbUnavailability } from "./db_utils.ts";
import { UserWithRequests } from "./request_utils.ts";

const separator = "|";
export function makeUnavailabilityId(
  { userId }: { userId: string },
) {
  return [userId, toJakartaDate(new Date())].join(separator);
}

export function mapUnavailUserToDbUnavailTuple(
  user: UserWithRequests,
): [unavailabilityId: string, unavailability: DbUnavailability] {
  const unavailabilityId = makeUnavailabilityId({
    userId: user.id,
  });

  return [
    unavailabilityId,
    {
      userId: user.id,
      availability: user.availability,
      unavailableTime: user.unavailableTime,
    },
  ];
}
