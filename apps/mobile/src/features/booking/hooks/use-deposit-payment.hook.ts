import { useCallback, useState } from "react";
import { useStripe } from "@stripe/stripe-react-native";

const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

export function isStripeConfigured(): boolean {
  return STRIPE_PUBLISHABLE_KEY.length > 0;
}

export function extractPaymentIntentId(clientSecret: string): string {
  const idx = clientSecret.indexOf("_secret");
  return idx > 0 ? clientSecret.slice(0, idx) : clientSecret;
}

/** True when the API returned a local/dev stub PaymentIntent secret. */
export function isStubClientSecret(clientSecret: string): boolean {
  return (
    clientSecret.startsWith("pi_stub_") || clientSecret.startsWith("pi_dev_")
  );
}

export type PayDepositResult = {
  paid: boolean;
  error?: string;
};

export type UseDepositPaymentResult = {
  paying: boolean;
  error: string | null;
  payDeposit: (params: {
    clientSecret: string;
    merchantName: string;
  }) => Promise<PayDepositResult>;
  clearError: () => void;
};

export function useDepositPayment(): UseDepositPaymentResult {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const payDeposit = useCallback(
    async ({
      clientSecret,
      merchantName,
    }: {
      clientSecret: string;
      merchantName: string;
    }): Promise<PayDepositResult> => {
      setError(null);

      if (isStubClientSecret(clientSecret)) {
        return { paid: true };
      }

      if (!isStripeConfigured()) {
        const message =
          "Payments are not configured on this build. Set EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY and try again.";
        setError(message);
        return { paid: false, error: message };
      }

      setPaying(true);
      try {
        const { error: initError } = await initPaymentSheet({
          paymentIntentClientSecret: clientSecret,
          merchantDisplayName: merchantName,
          allowsDelayedPaymentMethods: false,
          returnURL: "tablevera://stripe-redirect",
        });

        if (initError) {
          const message = initError.message ?? "Could not start payment";
          setError(message);
          return { paid: false, error: message };
        }

        const { error: presentError } = await presentPaymentSheet();
        if (presentError) {
          const message =
            presentError.code === "Canceled"
              ? "Payment cancelled"
              : (presentError.message ?? "Payment failed");
          setError(message);
          return { paid: false, error: message };
        }

        return { paid: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : "Payment failed";
        setError(message);
        return { paid: false, error: message };
      } finally {
        setPaying(false);
      }
    },
    [initPaymentSheet, presentPaymentSheet],
  );

  return {
    paying,
    error,
    payDeposit,
    clearError: () => setError(null),
  };
}
