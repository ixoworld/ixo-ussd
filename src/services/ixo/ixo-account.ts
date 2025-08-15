/**
 * Wallet and DID Operations
 *
 * Handles blockchain wallet generation and DID creation.
 * Combined because they're related blockchain operations.
 */

import { OfflineSigner } from "@cosmjs/proto-signing";
import { utils } from "@ixo/impactxclient-sdk";
import { createIidDocumentIfNotExists } from "../../utils/did.js";
import {
  grantFeegrant,
  queryAddressAllowances,
  decodeGrants,
  isAllowanceExpired,
  isAllowanceLimitReached,
} from "../../utils/feegrant.js";
import { getSecpClient } from "../../utils/secp.js";
import { createModuleLogger } from "../logger.js";
import type { IxoConfig } from "./config.js";

const logger = createModuleLogger("ixo-account");

export interface BlockchainWallet {
  mnemonic: string;
  wallet: any;
  address: string;
}

/**
 * Generates a new blockchain wallet with mnemonic
 */
export async function generateWallet(): Promise<BlockchainWallet> {
  logger.debug("Generating blockchain wallet");

  const mnemonic = utils.mnemonic.generateMnemonic();
  const wallet = await getSecpClient(mnemonic);
  const address = wallet.baseAccount.address;

  logger.info({ address }, "Generated blockchain wallet");

  return { mnemonic, wallet, address };
}

/**
 * Sets up fee grant for an address
 */
export async function setupFeegrant(
  address: string,
  config: IxoConfig
): Promise<void> {
  logger.debug({ address }, "Setting up fee grant");

  const feegrantIssued = await grantFeegrant(config, address);

  if (!feegrantIssued) {
    logger.info({ address }, "Fee grant already exists, skipping");
    return;
  }

  logger.info({ address }, "Fee grant setup complete via feegrant service");
}

/**
 * Creates or gets existing DID for an address with retry logic for fee grant propagation
 */
export async function createDid(
  address: string,
  offlineSigner: OfflineSigner,
  chainRpcUrl: string
): Promise<string> {
  logger.debug({ address }, "Creating DID");

  // Add minimal retry logic (should rarely be needed with proper finality wait)
  const maxRetries = 2;
  const retryDelay = 3000; // 3 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.debug({ address, attempt, maxRetries }, "Attempting DID creation");

      const allowances = await queryAddressAllowances(address);
      const feegrantGranter = allowances?.length
        ? decodeGrants(allowances)?.find(
            allowance =>
              !!allowance &&
              !isAllowanceExpired(allowance.expiration as number) &&
              !isAllowanceLimitReached(allowance.limit)
          )?.granter
        : undefined;

      logger.debug(
        {
          address,
          offlineSigner,
          chainRpcUrl,
          feegrantGranter,
        },
        "createIidDocumentIfNotExists params"
      );

      const did = await createIidDocumentIfNotExists({
        address,
        offlineSigner,
        chainRpcUrl,
        feegrantGranter,
      });

      logger.info({ address, did, attempt }, "DID created successfully");
      return did;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Check if it's the "account does not exist" error
      if (
        errorMessage.includes("does not exist on chain") &&
        attempt < maxRetries
      ) {
        logger.warn(
          {
            address,
            attempt,
            maxRetries,
            error: errorMessage,
            retryDelay,
          },
          "Account not found on chain, waiting for blockchain finality before retry"
        );

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }

      // If it's the last attempt or a different error, throw it
      logger.error(
        {
          address,
          attempt,
          maxRetries,
          error: errorMessage,
        },
        "DID creation failed"
      );
      throw error;
    }
  }

  throw new Error(`Failed to create DID after ${maxRetries} attempts`);
}
