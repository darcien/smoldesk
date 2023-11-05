import { load, z } from "./deps.ts";

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
};

const refreshSessionSchema = z.object({
  data: z.object({
    refreshSession: z.object({
      token: z.string(),
      refreshToken: z.string(),
    }),
  }),
});

export async function renewUserToken() {
  const res = await fetch(apiUrl, {
    "method": "POST",
    "headers": {
      ...defaultAuthenticatedHeaders,
    },
    "body": JSON.stringify({
      "operationName": "RefreshSession",
      "variables": {
        "refreshToken": refreshToken,
      },
      "query": `
mutation RefreshSession($refreshToken: String!) {
  refreshSession(refreshToken: $refreshToken) {
    token
    refreshToken
  }
}`,
      // "mutation RefreshSession($refreshToken: String!) {\\n  refreshSession(refreshToken: $refreshToken) {\\n    user {\\n      id\\n      email\\n      name\\n      avatar\\n      role\\n      title\\n      discord\\n      github\\n      phone\\n      totalAvailablePto\\n      totalAvailableSickLeave\\n      hireDate\\n      deviceIDs\\n      projects {\\n        id\\n        title\\n        users {\\n          id\\n          avatar\\n          name\\n          role\\n          title\\n          __typename\\n        }\\n        __typename\\n      }\\n      totalPtoRequestPending {\\n        totalPtoPending\\n        totalPendingDays\\n        __typename\\n      }\\n      totalSickleavePending\\n      __typename\\n    }\\n    token\\n    refreshToken\\n    __typename\\n  }\\n}\\n",
    }),
  });

  const json = await res.json();
  return refreshSessionSchema.parse(json).data.refreshSession;
}

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

export async function fetchAllUsersAvailability({ date }: { date: Date }) {
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      ...defaultAuthenticatedHeaders,
      authorization: `Bearer ${(await renewUserToken()).token}`,
    },
    body: JSON.stringify({
      operationName: "UsersAvailabilityAndBirthday",
      variables: {
        date: date.toISOString(),
        queryName: "",
        projects: [],
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
    allAvailableUsers: available,
    allUnavailableUsers: unavailable,
  };
}
