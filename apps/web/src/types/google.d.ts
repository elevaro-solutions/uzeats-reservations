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

interface Window {
  google?: {
    accounts?: {
      id: GoogleAccountsId;
    };
  };
}
