/**
 * Matrix Storage Operations
 *
 * Handles all Matrix operations: account creation, room management, and secure storage.
 * Simplified from the original complex Matrix handling.
 */

import { utils } from "@ixo/impactxclient-sdk";
import { createMatrixApiClient } from "@ixo/matrixclient-sdk";
import {
  checkIsUsernameAvailable,
  generatePasswordFromMnemonic,
  generateUsernameFromAddress,
  generateUserRoomAliasFromAddress,
  loginOrRegisterMatrixAccount,
} from "./matrix.js";
import { decrypt, encrypt } from "../../utils/encryption.js";
import { createModuleLogger } from "../logger.js";

const logger = createModuleLogger("matrix-storage");

export interface MatrixResult {
  status: string;
  mxUsername: string;
  mxUserId: string;
  mxMnemonicSource: string;
  mxMnemonic: string;
  mxRoomId: string;
  mxRoomAlias: string;
  mxPassword: string;
  error?: string;
}

/**
 * Handles complete Matrix onboarding: account creation, room setup, and storage
 */
export async function handleMatrixOnboarding(params: {
  address: string;
  did: string;
  wallet: any;
  config: {
    matrixHomeserverUrl: string;
    roomBotUrl: string;
  };
  pin: string;
}): Promise<MatrixResult> {
  const { address, did, wallet, config, pin } = params;
  const { matrixHomeserverUrl: homeServerUrl } = config;

  logger.info({ address }, "Starting Matrix onboarding");

  // Prepare all info for error resilience
  let mxUsername: string = "";
  let mxPassword: string = "";
  let mxMnemonic: string = "";
  let mxRoomId: string | undefined = undefined;
  let mxRoomAlias: string | undefined = undefined;
  let mxMnemonicSource: "decrypted" | "generated" = "generated";
  let account: any = undefined;
  let errorMessage: string | undefined = undefined;
  let status: string = "";

  try {
    // Generate username and check availability
    mxUsername = generateUsernameFromAddress(address);
    const isUsernameAvailable = await checkIsUsernameAvailable({
      homeServerUrl,
      username: mxUsername,
    });

    if (isUsernameAvailable) {
      logger.info(
        { mxUsername },
        "Matrix username available, generating new credentials"
      );
      mxMnemonic = utils.mnemonic.generateMnemonic(12);
    } else {
      logger.info(
        { mxUsername },
        "Matrix username exists, attempting to fetch credentials"
      );

      try {
        const existingData = await fetchExistingMatrixCredentials(wallet, pin);
        mxMnemonic = existingData.mnemonic;
        mxRoomId = existingData.roomId;
        mxMnemonicSource = "decrypted";
      } catch (error) {
        logger.warn(
          "Failed to fetch existing credentials, generating new ones"
        );
        mxMnemonic = utils.mnemonic.generateMnemonic(12);
      }
    }

    // Login or register Matrix account
    mxPassword = generatePasswordFromMnemonic(mxMnemonic);
    logger.info({ mxPassword }, "mxPassword generated");
    account = await loginOrRegisterMatrixAccount({
      homeServerUrl,
      username: mxUsername,
      password: mxPassword,
      wallet: {
        sign: async (message: string) => wallet.sign(message),
        baseAccount: wallet.baseAccount,
      },
    });

    if (!account?.accessToken) {
      throw new Error("Failed to login or register Matrix account");
    }

    // Handle room creation and storage for new accounts
    if (mxMnemonicSource === "generated") {
      const roomResult = await handleMatrixRoomAndStorage({
        address,
        did,
        account,
        mnemonic: mxMnemonic,
        pin,
        homeServerUrl,
        roomBotUrl: config.roomBotUrl,
      });

      mxRoomId = roomResult.roomId;
      mxRoomAlias = roomResult.roomAlias;
    }

    status =
      mxMnemonicSource === "generated"
        ? "New Account Created"
        : "Existing Account";
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    status = "Matrix onboarding failed";
  } finally {
    // Always return as much info as possible
    return {
      status,
      mxUsername: mxUsername ?? "",
      mxUserId: account?.userId ?? "",
      mxMnemonicSource: mxMnemonicSource ?? "",
      mxMnemonic: mxMnemonic ?? "",
      mxRoomId: mxRoomId ?? "",
      mxRoomAlias: mxRoomAlias ?? "",
      mxPassword: mxPassword ?? "",
      error: errorMessage ?? "",
    };
  }
  // let mxMnemonicSource: "decrypted" | "generated" = "generated";
}

/**
 * Fetches existing Matrix credentials using blockchain signature
 */
async function fetchExistingMatrixCredentials(
  wallet: any,
  pin: string
): Promise<{ mnemonic: string; roomId: string }> {
  const timestamp = new Date().toISOString();
  const challenge = Buffer.from(timestamp).toString("base64");
  const signature = await wallet.sign(challenge);

  const response = await fetch("/api/auth/get-secret-secp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address: wallet.baseAccount.address,
      secpResult: {
        challenge,
        signature: Buffer.from(signature).toString("base64"),
      },
    }),
  });

  if (!response.ok) {
    const errorData = (await response.json()) as { error?: string };
    if (errorData.error?.includes("M_NOT_FOUND: Room alias")) {
      throw new Error("Room alias not found");
    }
    throw new Error(errorData.error || "Failed to fetch credentials");
  }

  const { encryptedMnemonic, roomId } = (await response.json()) as {
    encryptedMnemonic: string;
    roomId: string;
  };
  const mnemonic = decrypt(encryptedMnemonic, pin);

  if (!mnemonic) {
    throw new Error("Failed to decrypt mnemonic - incorrect pin");
  }

  return { mnemonic, roomId };
}

/**
 * Handles Matrix room creation and mnemonic storage
 */
async function handleMatrixRoomAndStorage(params: {
  address: string;
  did: string;
  account: any;
  mnemonic: string;
  pin: string;
  homeServerUrl: string;
  roomBotUrl: string;
}): Promise<{ roomId: string; roomAlias?: string }> {
  const { address, did, account, mnemonic, pin, homeServerUrl, roomBotUrl } =
    params;

  // Create Matrix API client
  const matrixApiClient = createMatrixApiClient({
    homeServerUrl,
    accessToken: account.accessToken,
  });

  // Check for existing room
  const mxRoomAlias = generateUserRoomAliasFromAddress(address, homeServerUrl);
  let mxRoomId = "";

  try {
    const queryIdResponse =
      await matrixApiClient.room.v1beta1.queryId(mxRoomAlias);
    mxRoomId = queryIdResponse?.room_id || "";
  } catch {
    // Room doesn't exist, will create new one
  }

  // Create room if it doesn't exist
  if (!mxRoomId) {
    logger.info("Creating Matrix room via bot");

    const response = await fetch(`${roomBotUrl}/room/source`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ did, userMatrixId: account.userId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create Matrix room: ${await response.text()}`);
    }

    const data = (await response.json()) as {
      roomId: string;
      roomAlias: string;
    };
    mxRoomId = data.roomId;
  }

  // Join room if not already joined
  const joinedMembers = await matrixApiClient.room.v1beta1
    .listJoinedMembers(mxRoomId)
    .catch(() => undefined);

  if (!joinedMembers?.joined?.[account.userId]) {
    await matrixApiClient.room.v1beta1.join(mxRoomId);
  }

  // Store encrypted mnemonic in room
  const encryptedMnemonic = encrypt(mnemonic, pin);
  const storeResponse = await fetch(
    `${homeServerUrl}/_matrix/client/r0/rooms/${mxRoomId}/state/ixo.room.state.secure/encrypted_mnemonic`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${account.accessToken}`,
      },
      body: JSON.stringify({ encrypted_mnemonic: encryptedMnemonic }),
    }
  );

  if (!storeResponse.ok) {
    throw new Error("Failed to store encrypted mnemonic in Matrix room");
  }

  logger.info({ roomId: mxRoomId }, "Matrix room setup and storage complete");

  return { roomId: mxRoomId, roomAlias: mxRoomAlias };
}
