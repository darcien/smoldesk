export const UsersAvailabilityAndBirthdayQuery = `
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
`;
