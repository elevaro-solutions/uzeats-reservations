import { gql } from "@apollo/client";

export const LINK_GOOGLE = gql`
  mutation LinkGoogle($idToken: String!) {
    linkGoogle(idToken: $idToken) {
      id
      email
      hasPassword
      hasGoogle
      needsEmailVerification
    }
  }
`;
