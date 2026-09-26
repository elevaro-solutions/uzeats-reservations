import { gql } from "@apollo/client";

export const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      refreshToken
      user {
        id
        email
        phone
        firstName
        lastName
        role
      }
    }
  }
`;

export const REQUEST_PASSWORD_RESET = gql`
  mutation RequestPasswordReset($email: String!, $app: String) {
    requestPasswordReset(email: $email, app: $app) {
      success
      message
    }
  }
`;

export const LOGOUT = gql`
  mutation Logout($refreshToken: String) {
    logout(refreshToken: $refreshToken)
  }
`;

export const ME = gql`
  query Me {
    me {
      id
      email
      phone
      firstName
      lastName
      role
    }
  }
`;
