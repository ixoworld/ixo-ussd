import { createQueryClient } from "@ixo/impactxclient-sdk";

import { CHAIN_RPC_URL } from "../../constants/ixo-blockchain.js";

let queryClientInstance: Awaited<ReturnType<typeof createQueryClient>>;
let queryClientPromise: Promise<
  Awaited<ReturnType<typeof createQueryClient>>
> | null = null;

export const getQueryClient = async (rpc?: string) => {
  if (queryClientInstance) {
    return queryClientInstance;
  }

  if (!queryClientPromise) {
    queryClientPromise = createQueryClient(rpc ?? CHAIN_RPC_URL ?? "")
      .then(client => {
        queryClientInstance = client;
        queryClientPromise = null;
        return client;
      })
      .catch(error => {
        // Reset the promise if creation failed so subsequent calls can retry
        queryClientPromise = null;
        throw error;
      });
  }

  return queryClientPromise;
};
