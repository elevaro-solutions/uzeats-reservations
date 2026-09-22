import { useQuery } from "@apollo/client";
import { defaultLoyaltyProgram, type LoyaltyProgram } from "@reservations/shared";

import { LOYALTY_PROGRAM } from "@/graphql";

export function useLoyaltyProgram(): LoyaltyProgram {
  const { data } = useQuery<{ loyaltyProgram: LoyaltyProgram }>(LOYALTY_PROGRAM);
  return data?.loyaltyProgram ?? defaultLoyaltyProgram();
}
