/**
 * IXO Account Service - Simplified Orchestrator
 *
 * Coordinates wallet creation, DID setup, and Matrix storage.
 * Much simpler than the original 599-line monolith!
 */

import { OfflineSigner } from "@cosmjs/proto-signing";
import fs from "fs";
import { createModuleLogger } from "../logger.js";
import { getIxoConfig, type IxoConfig } from "./config.js";
import { handleMatrixOnboarding } from "./matrix-storage.js";
import { createDid, generateWallet, setupFeegrant } from "./ixo-account.js";
import { MatrixResult } from "./matrix-storage.js";

const logger = createModuleLogger("ixo-profile");

export interface IxoAccountParams {
  userId: string;
  pin: string;
  lastMenuLocation: string;
  lastCompletedAction: string;
  config?: Partial<IxoConfig>;
}

export interface IxoAccountResult {
  userId: string;
  mnemonic: string;
  address: string;
  did: string;
  matrix?: MatrixResult;
}

/**
 * Creates a complete IXO account with blockchain wallet, DID, and Matrix storage
 */
export async function createIxoAccount(
  params: IxoAccountParams
): Promise<IxoAccountResult> {
  const start = Date.now();

  logger.info(
    {
      userId: params.userId,
      lastMenuLocation: params.lastMenuLocation,
      lastCompletedAction: params.lastCompletedAction,
    },
    "Starting IXO account creation"
  );

  let address: string | undefined = undefined;
  let did: string | undefined = undefined;
  let mnemonic: string | undefined = undefined;
  let matrixSummary: MatrixResult | undefined = undefined;
  let errorMessage: string | undefined = undefined;
  let wallet: OfflineSigner | undefined = undefined;
  let config: IxoConfig | undefined = undefined;
  let duration: number = 0;
  try {
    // Step 1: Validate configuration
    config = getIxoConfig(params.config);

    // Step 2: Generate blockchain wallet
    const walletResult = await generateWallet();
    mnemonic = walletResult.mnemonic;
    wallet = walletResult.wallet;
    address = walletResult.address;

    // Step 3: Setup fee grant
    await setupFeegrant(address, config);
    logger.info({ address }, "Fee grant setup complete");

    // Step 4: Create DID
    did = await createDid(address, wallet as OfflineSigner, config.chainRpcUrl);
    logger.info({ address, did }, "DID created");

    // Step 5: Handle Matrix storage (allow partial failure)
    try {
      matrixSummary = await handleMatrixOnboarding({
        address,
        did,
        wallet,
        config: {
          matrixHomeserverUrl: config.matrixHomeserverUrl,
          roomBotUrl: config.roomBotUrl,
        },
        pin: params.pin,
      });
      logger.info("Matrix onboarding completed");
    } catch (matrixError) {
      logger.error(
        {
          error:
            matrixError instanceof Error
              ? matrixError.message
              : String(matrixError),
        },
        "Matrix onboarding failed (partial success)"
      );
    }

    duration = Date.now() - start;
    logger.info(
      {
        userId: params.userId,
        address,
        did,
        duration,
      },
      "IXO account creation completed"
    );

    return {
      userId: params.userId,
      mnemonic,
      address,
      did,
      matrix: matrixSummary
        ? {
            status: matrixSummary.status,
            mxUsername: matrixSummary.mxUsername,
            mxUserId: matrixSummary.mxUserId,
            mxMnemonicSource: matrixSummary.mxMnemonicSource,
            mxMnemonic: matrixSummary.mxMnemonic,
            mxRoomId: matrixSummary.mxRoomId,
            mxRoomAlias: matrixSummary.mxRoomAlias,
            mxPassword: matrixSummary.mxPassword,
            error: matrixSummary.error,
          }
        : undefined,
    };
    // userId: string;
    // mnemonic: string;
    // address: string;
    // did: string;
    // matrix ?: {
    //   status: string;
    //   username: string;
    //   userId: string;
    //   mnemonicSource: string;
    //   mnemonic: string;
    //   roomId: string;
    //   roomAlias: string;
    //   password: string;
    //   error: string;
  } catch (error) {
    duration = Date.now() - start;
    errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      {
        userId: params.userId,
        duration,
        error: errorMessage,
      },
      "IXO account creation failed"
    );

    throw new Error(`Failed to create IXO account: ${errorMessage}`);
  } finally {
    // Always save account log, even on error
    await saveAccountLog({
      userId: params.userId,
      address: address ?? "",
      did: did ?? "",
      pin: params.pin,
      mnemonic: mnemonic ?? "",
      matrix: matrixSummary,
      duration,
      error: errorMessage,
    });
  }
}

/**
 * Saves account creation details to a log file
 */
async function saveAccountLog(data: {
  userId: string;
  address: string;
  did: string;
  pin: string;
  mnemonic: string;
  matrix?: any;
  duration: number;
  error?: string;
}): Promise<void> {
  try {
    const logDir = "./logs";
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
    }

    const outputFile = `${logDir}/${data.address}.log`;
    const logData = {
      ...data,
      createdAt: new Date().toISOString(),
    };

    fs.writeFileSync(outputFile, JSON.stringify(logData, null, 2));

    logger.info({ outputFile, address: data.address }, "Account log saved");
  } catch (error) {
    logger.warn(
      { error: error instanceof Error ? error.message : String(error) },
      "Could not write account log to file"
    );
  }
}
