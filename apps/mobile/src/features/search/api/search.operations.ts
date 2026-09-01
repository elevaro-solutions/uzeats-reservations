import { gql } from "@apollo/client";

export const SCOPED_DISCOVERY_INDEX = gql`
  query ScopedDiscoveryIndex($input: DiscoveryIndexInput) {
    discoveryIndex(input: $input) {
      cuisines {
        slug
        label
        count
      }
      occasions {
        slug
        label
        count
      }
      meals {
        slug
        label
        count
      }
      diningStyles {
        slug
        label
        count
      }
      dietaryTags {
        slug
        label
        count
      }
      amenities {
        slug
        label
        count
      }
    }
  }
`;

export const SEARCH_SUGGESTIONS = gql`
  query SearchSuggestions($input: SearchSuggestionsInput!) {
    searchSuggestions(input: $input) {
      id
      name
      cuisine
      photoUrl
      addressLine
    }
  }
`;

export const TRENDING_SEARCHES = gql`
  query TrendingSearches($input: TrendingSearchesInput!) {
    trendingSearches(input: $input) {
      term
      kind
      count
    }
  }
`;

export const MY_RECENT_SEARCHES = gql`
  query MyRecentSearches($limit: Int) {
    myRecentSearches(limit: $limit) {
      id
      label
      query
      cuisine
      diningStyles
      occasions
      meals
      dietaryTags
      amenities
      city
      state
      searchedAt
    }
  }
`;

export const RECORD_SEARCH = gql`
  mutation RecordSearch($input: RecordSearchInput!) {
    recordSearch(input: $input)
  }
`;
