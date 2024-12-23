// This query is obtained by inspecting the request send by
// Kodesk client in the dashboard.
export const UsersAvailabilityAndBirthdayQuery = `
query UsersAvailabilityAndBirthday($queryName: String, $projects: [String!], $date: String!) {
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

fragment PtoRequest on PtoRequest {
  id
  requestDate
  endDate
  totalDay
  status
  unavailableTime
  requestReason
  user {
    id
    __typename
  }
  __typename
}

fragment UserWithPTOAndSickLeave on UserWithPtoAndSickleave {
  id
  name
  totalAvailablePto
  totalAvailableSickLeave
  availability
  unavailableTime
  ptoRequests {
    ...PtoRequest
    __typename
  }
  projects {
    id
    title
    users {
      id
      avatar
      name
      role
      title
      __typename
    }
    __typename
  }
  __typename
}

fragment GuestUserWithAvailability on GuestUserWithAvailability {
  id
  name
  availability
  unavailableTime
  ptoRequests {
    ...PtoRequest
    __typename
  }
  __typename
}
`;
