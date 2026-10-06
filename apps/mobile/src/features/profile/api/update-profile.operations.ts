import { gql } from "@apollo/client";

export const UPDATE_MY_PROFILE = gql`
  mutation UpdateMyProfile($input: UpdateMyProfileInput!) {
    updateMyProfile(input: $input) {
      id
      firstName
      lastName
      avatarUrl
      email
      phone
      hasPassword
      hasGoogle
      needsEmailVerification
      address {
        line1
        line2
        city
        state
        zip
        country
      }
    }
  }
`;
