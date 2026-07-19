/** Shared typings for Google client scripts loaded in the browser. */

type GoogleAccountsId = {
  initialize: (config: {
    client_id: string;
    callback: (response: { credential: string }) => void;
    auto_select?: boolean;
  }) => void;
  prompt: () => void;
  renderButton: (element: HTMLElement, config: Record<string, unknown>) => void;
};

type GooglePlacesAutocompleteService = {
  getPlacePredictions: (
    request: {
      input: string;
      types?: string[];
      componentRestrictions?: { country: string | string[] };
      sessionToken?: unknown;
    },
    callback: (
      predictions: Array<{
        place_id: string;
        description: string;
        structured_formatting: {
          main_text: string;
          secondary_text: string;
        };
      }> | null,
      status: string,
    ) => void,
  ) => void;
};

type GooglePlacesService = {
  getDetails: (
    request: { placeId: string; fields: string[]; sessionToken?: unknown },
    callback: (
      result: {
        formatted_address?: string;
        name?: string;
        geometry?: { location: { lat: () => number; lng: () => number } };
      } | null,
      status: string,
    ) => void,
  ) => void;
};

interface Window {
  google?: {
    accounts?: {
      id: GoogleAccountsId;
    };
    maps?: {
      places: {
        AutocompleteService: new () => GooglePlacesAutocompleteService;
        PlacesService: new (attrContainer: HTMLDivElement) => GooglePlacesService;
        AutocompleteSessionToken: new () => unknown;
      };
    };
  };
  __rtGoogleMapsPromise?: Promise<NonNullable<Window['google']>>;
}
