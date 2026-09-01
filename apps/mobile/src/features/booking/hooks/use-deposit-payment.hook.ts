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

export function isStubClientSecret(clientSecret: string): boolean {
  return clientSecret.startsWith("pi_stub_") || !isStripeConfigured();
}

export type UseDepositPaymentResult = {
  paying: boolean;
  error: string | null;
  payDeposit: (params: {
    clientSecret: string;
    merchantName: string;
  }) => Promise<boolean>;
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
    }) => {
      setError(null);

      if (isStubClientSecret(clientSecret)) {
        return true;
      }

      setPaying(true);
      try {
        const { error: initError } = await initPaymentSheet({
          paymentIntentClientSecret: clientSecret,
          merchantDisplayName: merchantName,
          allowsDelayedPaymentMethods: false,
        });

        if (initError) {
          setError(initError.message ?? "Could not start payment");
          return false;
        }

        const { error: presentError } = await presentPaymentSheet();
        if (presentError) {
          if (presentError.code === "Canceled") {
            setError("Payment cancelled");
          } else {
            setError(presentError.message ?? "Payment failed");
          }
          return false;
        }

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Payment failed");
        return false;
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
