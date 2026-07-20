/**
 * Untyped Apollo React hooks for dashboard pages that don't use codegen.
 * Mirrors the web app's pragmatic `as any` approach for Apollo Client 4.
 */
import {
  useApolloClient as useApolloClientBase,
  useLazyQuery as useLazyQueryBase,
  useMutation as useMutationBase,
  useQuery as useQueryBase,
} from '@apollo/client/react';

export function useQuery(query: any, options?: any): any {
  return useQueryBase(query, options);
}

export function useMutation(mutation: any, options?: any): any {
  return useMutationBase(mutation, options);
}

export function useLazyQuery(query: any, options?: any): any {
  return useLazyQueryBase(query, options);
}

export function useApolloClient(): any {
  return useApolloClientBase();
}
