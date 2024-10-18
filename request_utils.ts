import { load, z } from "./deps.ts";
import { UsersAvailabilityAndBirthdayQuery } from "./graphql_utils.ts";
import { logger } from "./logger_utils.ts";

const config = await load();

const timeRangeSchema = z.enum(["FULL_DAY", "MORNING", "AFTERNOON", "EVENING"]);
export type TimeRange = z.TypeOf<typeof timeRangeSchema>;
const ptoRequestSchema = z.object({
  id: z.string(),
  requestDate: z.string().datetime(),
  endDate: z.string().datetime(),
  totalDay: z.number(),
  status: z.string(),
  unavailableTime: timeRangeSchema,
  requestReason: z.string().optional(),
});
export type PtoRequest = z.TypeOf<typeof ptoRequestSchema>;

const userWithRequestsSchema = z.object({
  id: z.string(),
  name: z.string(),
  availability: z.string(),
  unavailableTime: timeRangeSchema,
  ptoRequests: z.array(ptoRequestSchema),
});
export type UserWithRequests = z.TypeOf<typeof userWithRequestsSchema>;
export type UserId = UserWithRequests["id"];
const resSchema = z.object({
  data: z.object({
    usersAvailabilityAndBirthday: z.object({
      unavailable: z.array(userWithRequestsSchema),
      available: z.array(userWithRequestsSchema),
      // not used for now
      // birthday: z.array(z.object({})),
    }),
  }),
});

const userToken = config.KODESK_USER_BEARER_TOKEN;
const refreshToken = config.KODESK_USER_REFRESH_TOKEN;

const apiUrl = config.KODESK_API_URL || "";
if (apiUrl === "") {
  throw new Error("KODESK_API_URL is not set");
}

const defaultAuthenticatedHeaders = {
  authorization: `Bearer ${userToken}`,
  "content-type": "application/json",
  "x-client-timezone": "Asia/Jakarta",
  "x-client-time": new Date().toISOString(),
};

const defaultRequestTimeoutInMs = 10_000;

const refreshSessionSchema = z.object({
  data: z.object({
    refreshSession: z.object({
      token: z.string(),
      refreshToken: z.string(),
    }),
  }),
});

// This is not really authenticated since we rely on refreshing token
// before every call.
// TODO: refactor this to actually refresh if needed
async function execAuthenticatedOperation(
  {
    operationName,
    variables,
    query,
    additionalHeaders,
  }: {
    operationName: string;
    variables: Record<string, unknown>;
    query: string;
    additionalHeaders?: HeadersInit;
  },
) {
  const t0 = performance.now();
  logger().info(`[request] executing operation ${operationName}`);

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      ...defaultAuthenticatedHeaders,
      ...additionalHeaders,
    },
    signal: AbortSignal.timeout(defaultRequestTimeoutInMs),
    body: JSON.stringify({
      operationName,
      variables,
      query,
    }),
  });

  const t1 = performance.now();
  logger().info(
    `[request] operation ${operationName} finished in ${t1 - t0}ms`,
  );
  return res;
}

export async function renewUserToken() {
  const res = await execAuthenticatedOperation({
    operationName: "RefreshSession",
    variables: {
      refreshToken,
    },
    query: `
mutation RefreshSession($refreshToken: String!) {
  refreshSession(refreshToken: $refreshToken) {
    token
    refreshToken
  }
}`,
  });

  const json = await res.json();
  return refreshSessionSchema.parse(json).data.refreshSession;
}

export enum FetchResult {
  Ok,
  ErrorMalformedResponse,
  ErrorTimeout,
  ErrorUnknown,
}

// TODO: this request module needs cleaned up
export async function fetchAllUsersAvailability({ date }: { date: Date }) {
  try {
    const newToken = (await renewUserToken()).token;

    const res = await execAuthenticatedOperation({
      additionalHeaders: {
        authorization: `Bearer ${newToken}`,
      },
      operationName: "UsersAvailabilityAndBirthday",
      variables: {
        date: date.toISOString(),
        queryName: "",
        // Don't send empty projects array, it will return no users
        // projects: [],
      },
      query: UsersAvailabilityAndBirthdayQuery,
    });

    if (!res.ok) {
      logger().warning(
        `[request] Not ok response from server, status=${res.status}`,
      );
      return {
        status: FetchResult.ErrorUnknown,
        error: new Error(
          `Not ok response from server, status=${res.status}, body=${await res
            .text()}`,
        ),
      };
    }

    const json = await res.json();
    logger().info(
      `[request] Parsing UsersAvailabilityAndBirthday query response as JSON`,
    );

    const parseRes = resSchema.safeParse(json);

    if (!parseRes.success) {
      logger().warning(
        `[request] Failed to parse UsersAvailabilityAndBirthday JSON, error=${parseRes.error.message}`,
      );
      logger().info(
        `[request] Raw response body: ${JSON.stringify(json, null, 2)}`,
      );
      return {
        status: FetchResult.ErrorMalformedResponse,
        error: parseRes.error,
      };
    }

    const { available, unavailable } =
      parseRes.data.data.usersAvailabilityAndBirthday;
    logger().info(
      `[request] UsersAvailabilityAndBirthday response valid, unavailableUsersCount=${unavailable.length}`,
    );
    return {
      status: FetchResult.Ok,
      allAvailableUsers: available,
      allUnavailableUsers: unavailable,
    };
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return {
        status: FetchResult.ErrorTimeout,
        error,
      };
    } else {
      return {
        status: FetchResult.ErrorUnknown,
        error,
      };
    }
  }
}

/**
 * @deprecated
 */
export async function fetchUserAvailability() {
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      ...defaultAuthenticatedHeaders,
      authorization: `Bearer ${(await renewUserToken()).token}`,
    },
    body: JSON.stringify({
      operationName: "UsersAvailabilityAndBirthday",
      variables: {
        date: new Date().toISOString(),
        queryName: "",
        projects: config.KODESK_PROJECT_ID ? [config.KODESK_PROJECT_ID] : [],
      },
      query: `
  query UsersAvailabilityAndBirthday($queryName: String, $projects: [String!], $date: String) {
    usersAvailabilityAndBirthday(
      input: {date: $date, queryName: $queryName, projects: $projects}
    ) {
      birthday {
        ...UserWithPTOAndSickLeave
        __typename
      }
      unavailable {
        __typename
        ... on UserWithPtoAndSickleave {
          ...UserWithPTOAndSickLeave
          __typename
        }
        ... on GuestUserWithAvailability {
          ...GuestUserWithAvailability
          __typename
        }
      }
      available {
        __typename
        ... on UserWithPtoAndSickleave {
          ...UserWithPTOAndSickLeave
          __typename
        }
        ... on GuestUserWithAvailability {
          ...GuestUserWithAvailability
          __typename
        }
      }
      __typename
    }
  }
  
  fragment UserWithPTOAndSickLeave on UserWithPtoAndSickleave {
    id
    name
    availability
    unavailableTime
    ptoRequests {
      id
      requestDate
      endDate
  
      totalDay
      status
      requestReason
      unavailableTime
  
      __typename
    }
    __typename
  }
  
  fragment GuestUserWithAvailability on GuestUserWithAvailability {
    id
    __typename
  }
  `,
    }),
  });
  const json = await res.json();
  const { data } = resSchema.parse(json);
  const { available, unavailable } = data.usersAvailabilityAndBirthday;
  return {
    availableUsers: available,
    unavailableUsers: unavailable,
  };
}
