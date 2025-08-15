/**
 * IXO blockchain query service
 */
import { createQueryClient } from "@ixo/impactxclient-sdk";
import { createModuleLogger } from "../logger.js";

// Create a module-specific logger
const logger = createModuleLogger("ixo-queries");

export async function getIxoAccountBalance(
  address: string,
  chainRpcUrl: string
): Promise<string> {
  try {
    const queryClient = await createQueryClient(chainRpcUrl);
    const balanceResponse = await queryClient.cosmos.bank.v1beta1.balance({
      address,
      denom: "uixo",
    });

    const balance = balanceResponse.balance?.amount || "0";
    return balance;
  } catch (err) {
    logger.error(
      {
        error: err instanceof Error ? err.message : String(err),
        address,
        chainRpcUrl,
      },
      "Failed to fetch IXO balance"
    );
    return "0";
  }
}
