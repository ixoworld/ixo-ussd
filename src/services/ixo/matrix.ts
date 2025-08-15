import md5 from "md5";
import { sha256 } from "@cosmjs/crypto";
import { ClientEvent, createClient, MatrixClient } from "matrix-js-sdk";
import { encrypt as eciesEncrypt } from "eciesjs";
import cons from "../../constants/matrix.js";
import { delay } from "../../utils/timestamp.js";
import { createMatrixApiClient } from "@ixo/matrixclient-sdk";
import { createModuleLogger } from "../logger.js";

// Create a module-specific logger
const logger = createModuleLogger("matrix");

const WELL_KNOWN_URI = "/.well-known/matrix/client";

type MatrixApiClient = ReturnType<typeof createMatrixApiClient>;

/** Private helper to create a MatrixApiClient from an AuthResponse */
const getMatrixApiClientFromAuth = (auth: AuthResponse): MatrixApiClient =>
  createMatrixApiClient({
    homeServerUrl: auth.baseUrl,
    accessToken: auth.accessToken,
  });

// =================================================================================================
// AUTH
// =================================================================================================
export interface AuthResponse {
  accessToken: string;
  deviceId: string;
  userId: string;
  baseUrl: string;
  displayName: string;
  avatarUrl: string;
}

const mxLogin = async (
  {
    homeServerUrl,
    username,
    password,
  }: { homeServerUrl: string; username: string; password: string },
  localMatrix = false
) => {
  logger.debug(
    {
      homeServerUrl,
      username,
      localMatrix,
    },
    "Matrix login attempt"
  );

  let mxHomeServerUrl = homeServerUrl;
  let mxUsername = username;
  const mxIdMatch = mxUsername.match(/^@(.+):(.+\..+)$/);
  if (mxIdMatch) {
    mxUsername = mxIdMatch[1] as string;
    mxHomeServerUrl = mxIdMatch[2] as string;
    mxHomeServerUrl = localMatrix
      ? mxHomeServerUrl
      : await getBaseUrl(mxHomeServerUrl);
  }

  try {
    const client = createTemporaryClient(mxHomeServerUrl);
    // Using the object-style login which is the current recommended approach
    // The Matrix SDK shows this as deprecated but this is actually the modern approach
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment, @typescript-eslint/no-deprecated
    // @ts-ignore - Matrix SDK deprecation warning, but this is the correct modern approach
    const response = await client.login("m.login.password", {
      identifier: {
        type: "m.id.user",
        user: normalizeUsername(mxUsername),
      },
      password,
      initial_device_display_name: cons.DEVICE_DISPLAY_NAME,
    });
    const data: AuthResponse = {
      accessToken: response.access_token,
      deviceId: response.device_id,
      userId: response.user_id,
      baseUrl: mxHomeServerUrl,
      displayName: "",
      avatarUrl: "",
    };
    return data;
  } catch (error) {
    let msg = (error as any).message;
    if (msg === "Unknown message") {
      msg = "Please check your credentials";
    }

    logger.error(
      {
        homeServerUrl: mxHomeServerUrl,
        username: mxUsername,
        error: msg,
      },
      "Matrix login failed"
    );

    throw new Error(msg);
  }
};

// =================================================================================================
// NEW API-BASED REGISTRATION
// =================================================================================================

interface PublicKeyResponse {
  publicKey: string;
  fingerprint: string;
  algorithm: string;
  usage: string;
}

interface UserCreationChallenge {
  timestamp: string;
  address: string;
  service: string;
  type: string;
}

interface UserCreationRequest {
  address: string;
  encryptedPassword: string;
  publicKeyFingerprint: string;
  authnResult?: any;
  secpResult?: {
    signature: string;
    challenge: string;
  };
}

interface UserCreationResponse {
  success: boolean;
  matrixUserId: string;
  address: string;
  message: string;
}

/**
 * Fetch the public key for password encryption from the user creation API
 * @returns Public key information for encryption
 */
export async function getPublicKeyForEncryption(): Promise<PublicKeyResponse> {
  const matrixBotUrl = process.env.MATRIX_BOT_URL;
  if (!matrixBotUrl) {
    throw new Error("MATRIX_BOT_URL environment variable is not set");
  }

  const url = `${matrixBotUrl}/public-key`;

  logger.info({ url }, "Fetching Matrix public key");

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    logger.debug(
      {
        status: response.status,
        url,
      },
      "Matrix public key response received"
    );

    if (!response.ok) {
      logger.debug(
        {
          headers: Object.fromEntries(response.headers.entries()),
        },
        "Matrix public key response headers"
      );

      const responseText = await response.text();

      logger.debug(
        {
          body: responseText,
        },
        "Matrix public key raw response body"
      );

      let errorData = { error: "Unknown error" };
      try {
        errorData = JSON.parse(responseText) as { error: string };
      } catch (parseError) {
        logger.error(
          {
            parseError:
              parseError instanceof Error
                ? parseError.message
                : String(parseError),
            responseText,
          },
          "Failed to parse Matrix public key error response as JSON"
        );
        errorData = { error: responseText || "Failed to parse error response" };
      }

      logger.error(
        {
          error: errorData.error,
          status: response.status,
        },
        "Failed to fetch Matrix public key"
      );

      throw new Error(
        errorData.error || "Failed to fetch public key for encryption"
      );
    }

    const data = await response.json();

    logger.info("Successfully fetched Matrix public key");

    return data as PublicKeyResponse;
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        url,
      },
      "Error fetching Matrix public key"
    );
    throw error;
  }
}

/**
 * Create a structured challenge for user creation
 * @param address The user's address (without did:ixo: prefix)
 * @returns The challenge object and its base64 representation
 */
export function createUserCreationChallenge(address: string): {
  challenge: UserCreationChallenge;
  challengeBase64: string;
} {
  const challenge: UserCreationChallenge = {
    timestamp: new Date().toISOString(),
    address: address,
    service: "matrix",
    type: "create-account",
  };

  const challengeBase64 = Buffer.from(JSON.stringify(challenge)).toString(
    "base64"
  );

  return { challenge, challengeBase64 };
}

/**
 * Encrypt password using ECIES with the provided public key
 * @param password The password to encrypt
 * @param publicKey The public key in hex format
 * @returns The encrypted password in hex format
 */
export function encryptPasswordWithECIES(
  password: string,
  publicKey: string
): string {
  const publicKeyBytes = new Uint8Array(Buffer.from(publicKey, "hex"));
  const passwordBytes = new Uint8Array(Buffer.from(password, "utf8"));
  const encryptedPassword = eciesEncrypt(publicKeyBytes, passwordBytes);
  return Array.from(encryptedPassword, byte =>
    byte.toString(16).padStart(2, "0")
  ).join("");
}

/**
 * Create user account using secp256k1 signature authentication
 * @param address The user's address
 * @param password The matrix password
 * @param signature The secp256k1 signature (base64)
 * @param challenge The challenge that was signed (base64)
 * @returns The user creation response
 */
export async function createUserAccountWithSecp(
  address: string,
  password: string,
  signature: string,
  challenge: string
): Promise<UserCreationResponse> {
  logger.info(
    {
      address,
    },
    "Starting Matrix user account creation"
  );

  const publicKeyInfo = await getPublicKeyForEncryption();

  logger.debug("Got Matrix public key, encrypting password");

  const encryptedPassword = encryptPasswordWithECIES(
    password,
    publicKeyInfo.publicKey
  );

  const request: UserCreationRequest = {
    address,
    encryptedPassword,
    publicKeyFingerprint: publicKeyInfo.fingerprint,
    secpResult: {
      signature,
      challenge,
    },
  };

  const matrixBotUrl = process.env.MATRIX_BOT_URL;
  if (!matrixBotUrl) {
    throw new Error("MATRIX_BOT_URL environment variable is not set");
  }

  const url = `${matrixBotUrl}/user/create`;

  logger.info(
    {
      url,
      address,
    },
    "Creating Matrix user account"
  );

  logger.debug(
    {
      address: request.address,
      publicKeyFingerprint: request.publicKeyFingerprint,
      hasSecpResult: !!request.secpResult,
    },
    "Matrix user creation request payload"
  );

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    logger.debug(
      {
        status: response.status,
        url,
      },
      "Matrix create user response received"
    );

    if (!response.ok) {
      logger.debug(
        {
          headers: Object.fromEntries(response.headers.entries()),
        },
        "Matrix create user response headers"
      );

      const responseText = await response.text();

      logger.debug(
        {
          body: responseText,
        },
        "Matrix create user raw response body"
      );

      let errorData = { error: "Unknown error" };
      try {
        errorData = JSON.parse(responseText) as { error: string };
      } catch (parseError) {
        logger.error(
          {
            parseError:
              parseError instanceof Error
                ? parseError.message
                : String(parseError),
            responseText,
          },
          "Failed to parse Matrix create user error response as JSON"
        );
        errorData = { error: responseText || "Failed to parse error response" };
      }

      logger.error(
        {
          error: errorData.error,
          status: response.status,
          address,
        },
        "Failed to create Matrix user"
      );

      throw new Error(errorData.error || "Failed to create user account");
    }

    const data = (await response.json()) as UserCreationResponse;

    logger.info(
      {
        address,
        matrixUserId: data.matrixUserId,
      },
      "Successfully created Matrix user account"
    );

    return data;
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        address,
        url,
      },
      "Error creating Matrix user account"
    );
    throw error;
  }
}

// =================================================================================================
// UPDATED REGISTRATION FUNCTIONS
// =================================================================================================

/**
 * Register matrix account using the new API with secp256k1 signature authentication
 * @param address The user's address
 * @param password The matrix password
 * @param wallet The secp wallet for signing
 * @returns AuthResponse with access token and user details
 */
export async function mxRegisterWithSecp(
  address: string,
  password: string,
  wallet: { sign: (message: string) => Promise<Uint8Array> }
): Promise<AuthResponse> {
  try {
    // Create challenge and sign it
    const { challengeBase64 } = createUserCreationChallenge(address);
    const signatureBytes = await wallet.sign(challengeBase64);
    const signature = Buffer.from(signatureBytes).toString("base64");

    const userCreationResult = await createUserAccountWithSecp(
      address,
      password,
      signature,
      challengeBase64
    );

    if (!userCreationResult.success) {
      throw new Error("Failed to create matrix account via API");
    }

    // Now login to get the access token
    const homeServerUrl = process.env.MATRIX_HOME_SERVER as string;
    const username = generateUsernameFromAddress(address);

    const loginResult = await mxLogin({
      homeServerUrl,
      username,
      password,
    });

    return loginResult;
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        address,
      },
      "Matrix registration with secp256k1 failed"
    );
    throw error;
  }
}

// =================================================================================================
// UPDATED LEGACY REGISTRATION (DEPRECATED)
// =================================================================================================

export async function loginOrRegisterMatrixAccount({
  homeServerUrl,
  username,
  password,
  wallet,
}: {
  homeServerUrl: string;
  username: string;
  password: string;
  wallet?: {
    sign: (message: string) => Promise<Uint8Array>;
    baseAccount: { address: string };
  };
}) {
  const isUsernameAvailable = await checkIsUsernameAvailable({
    homeServerUrl,
    username,
  });
  let res: AuthResponse | undefined;
  if (isUsernameAvailable && wallet) {
    // Use new API-based registration with secp256k1 authentication
    res = await mxRegisterWithSecp(
      wallet.baseAccount.address,
      password,
      wallet
    );
    if (!res?.accessToken) {
      throw new Error("Failed to register matrix account");
    }

    logger.info(
      {
        userId: res.userId,
        username,
      },
      "Matrix registration with secp256k1 successful"
    );
  }
  res = await mxLogin({
    homeServerUrl,
    username,
    password,
  });
  if (!res?.accessToken) {
    throw new Error("Failed to login to matrix account");
  }

  logger.info(
    {
      userId: res.userId,
      username,
    },
    "Matrix login successful"
  );

  return res;
}

export async function checkIsUsernameAvailable({
  homeServerUrl,
  username,
}: {
  homeServerUrl: string;
  username: string;
}) {
  const client = createTemporaryClient(homeServerUrl);
  try {
    const isUsernameAvailable = await client.isUsernameAvailable(username);
    return !!isUsernameAvailable;
  } catch (error) {
    return false;
  }
}

// =================================================================================================
// CLIENT
// =================================================================================================
/**
 * Creates a temporary matrix client, used for matrix login or registration to get access tokens
 * @param homeServerUrl - the home server url to instantiate the matrix client
 * @returns matrix client
 */
export function createTemporaryClient(homeServerUrl: string) {
  if (!homeServerUrl) {
    throw new Error("Home server URL is required to instantiate matrix client");
  }
  return createClient({
    baseUrl: homeServerUrl,
  });
}

export async function createMatrixClient({
  homeServerUrl,
  accessToken,
  userId,
  deviceId,
}: {
  homeServerUrl: string;
  accessToken: string;
  userId: string;
  deviceId: string;
}) {
  logger.info(
    {
      homeServerUrl,
      userId,
      deviceId,
      hasAccessToken: !!accessToken,
    },
    "Creating Matrix client"
  );

  if (!homeServerUrl || !accessToken || !userId || !deviceId) {
    throw new Error(
      "Login to Matrix account before trying to instantiate Matrix client."
    );
  }

  const mxClient = createClient({
    baseUrl: homeServerUrl,
    accessToken: accessToken,
    userId: userId,
    deviceId: deviceId,
    timelineSupport: true,
    verificationMethods: ["m.sas.v1"],
  });
  await mxClient.initRustCrypto();
  mxClient.setMaxListeners(20);

  await mxClient.startClient({
    lazyLoadMembers: true,
    // initialSyncLimit: 1,
    includeArchivedRooms: false,
    // pollTimeout: 2 * 60 * 1000, // poll every 2 minutes
    // filter: filter,
  });
  await new Promise<void>((resolve, reject) => {
    const sync = {
      NULL: () => {
        logger.debug("[Matrix] Client sync state: NULL");
      },
      SYNCING: () => {
        void 0;
      },
      PREPARED: () => {
        logger.info(
          {
            userId,
          },
          "[Matrix] Client sync state: PREPARED"
        );
        resolve();
      },
      RECONNECTING: () => {
        logger.info("[Matrix] Client sync state: RECONNECTING");
      },
      CATCHUP: () => {
        logger.info("[Matrix] Client sync state: CATCHUP");
      },
      ERROR: () => {
        reject(new Error("[ERROR] state: starting matrix client"));
      },
      STOPPED: () => {
        logger.info("[Matrix] Client sync state: STOPPED");
      },
    };
    mxClient.on(ClientEvent.Sync, state => {
      sync[state]();
    });
  });
  return mxClient;
}

export async function logoutMatrixClient({
  mxClient,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  baseUrl: _baseUrl,
}: {
  mxClient?: MatrixClient;
  baseUrl?: string;
}) {
  const client = mxClient;
  if (!client) {
    // const homeServerUrl = secret.baseUrl;
    // const accessToken = secret.accessToken;
    // const userId = secret.userId;
    // const deviceId = secret.deviceId;
    // client = createClient({
    //   baseUrl: homeServerUrl ?? baseUrl,
    //   accessToken,
    //   userId,
    //   deviceId,
    // });
  }
  if (client) {
    client.stopClient();
    await client.logout().catch((error: unknown) => {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
        },
        "Error during Matrix client logout"
      );
    });
    client.clearStores();
  }
}

// =================================================================================================
// CROSS SIGNING
// =================================================================================================
/**
 * Check if the user has cross-signing account data.
 * @param {MatrixClient} mxClient - The matrix client to check.
 * @returns {boolean} True if the user has cross-signing account data, otherwise false.
 */
export function hasCrossSigningAccountData(mxClient: MatrixClient): boolean {
  const masterKeyData = mxClient.getAccountData("m.cross_signing.master");

  logger.debug(
    {
      hasMasterKeyData: !!masterKeyData,
    },
    "Checking Matrix cross-signing account data"
  );

  return !!masterKeyData;
}

/**
 * Setup cross signing and secret storage for the current user
 * @param {MatrixClient} mxClient - The matrix client to setup cross signing for
 * @param {object} options - Configuration options
 * @param {string} options.securityPhrase - the security phrase to use for secret storage
 * @param {string} options.password - the password for the matrix account
 * @param {boolean} [options.forceReset=false] - if to force reset the cross signing keys (NB, only do if you know what you are doing!!!)
 * @param {boolean} [options.skipBootstrapSecureStorage=false] - if to skip bootstrapping secret storage
 * @returns {boolean} True if the cross signing was setup successfully, otherwise false.
 */
export async function setupCrossSigning(
  mxClient: MatrixClient,
  {
    securityPhrase,
    password,
    forceReset = false,
    skipBootstrapSecureStorage = false,
  }: {
    securityPhrase: string;
    password: string;
    forceReset?: boolean;
    skipBootstrapSecureStorage?: boolean;
  }
): Promise<boolean> {
  const mxCrypto = mxClient.getCrypto();
  if (!mxCrypto) {
    throw new Error(
      "Failed to setup matrix cross signing - failed to get matrix crypto api"
    );
  }
  if (!skipBootstrapSecureStorage) {
    const recoveryKey =
      await mxCrypto.createRecoveryKeyFromPassphrase(securityPhrase);
    await mxCrypto.bootstrapSecretStorage({
      createSecretStorageKey: async () => recoveryKey!,
      setupNewSecretStorage: forceReset,
    });
  }
  const userId = mxClient.getUserId()!;
  await mxCrypto.bootstrapCrossSigning({
    authUploadDeviceSigningKeys: async function (makeRequest: any) {
      await makeRequest(getAuthId({ userId, password }));
    },
    setupNewCrossSigning: forceReset,
  });
  await mxCrypto.resetKeyBackup();

  await delay(300);

  return !!mxClient.getAccountData("m.cross_signing.master");
}

// =================================================================================================
// GENERAL
// =================================================================================================
/**
 * Generates a username from an address, used for matrix login, generated an account did
 * @param {string} address - the address to generate the username from
 * @returns {string} username
 */
export function generateUsernameFromAddress(address: string): string {
  if (!address) {
    throw new Error("Address is required to generate matrix username");
  }
  return "did-ixo-" + address;
}

/**
 * Generates a password from a mnemonic, used for matrix login, generated using the first 24 bytes of the base64 encoded md5 hash of the mnemonic
 * @param {string} mnemonic - the mnemonic to generate the password from
 * @returns {string} password
 */
export function generatePasswordFromMnemonic(mnemonic: string): string {
  const base64 = Buffer.from(md5(mnemonic.replace(/ /g, ""))).toString(
    "base64"
  );
  return base64.slice(0, 24);
}

/**
 * Generates a recovery phrase from a mnemonic, used for matrix recovery, generated using the first 32 bytes of the base64 encoded sha256 hash of the mnemonic
 * @param {string} mnemonic - the mnemonic to generate the recovery phrase from
 * @returns {string} recoveryPhrase
 */
export function generateRecoveryPhraseFromMnemonic(mnemonic: string): string {
  const hash = sha256(new TextEncoder().encode(mnemonic.replace(/ /g, "")));
  const base64 = Buffer.from(hash).toString("base64");
  return base64.slice(0, 32);
}

/**
 * Extracts the home server URL from a user ID.
 * @param {string} userId - The user ID to extract the homeserver URL from.
 * @returns {string} The homeserver URL.
 */
export function extractHomeServerUrlFromUserId(userId: string): string {
  const parts = userId.split(":");
  if (parts.length < 2) {
    throw new Error("Invalid userId");
  }
  return parts.slice(1).join(":");
}

/**
 * Generates a recovery phrase from a mnemonic, used for matrix recovery, generated using the first 32 bytes of the base64 encoded sha256 hash of the mnemonic
 * @param {string} mnemonic - the mnemonic to generate the recovery phrase from
 * @returns {string} passphrase
 */
export function generatePassphraseFromMnemonic(mnemonic: string): string {
  const hash = sha256(new TextEncoder().encode(mnemonic.replace(/ /g, "")));
  const base64 = Buffer.from(hash).toString("base64");
  return base64.slice(0, 32);
}

/**
 * Cleans a home server URL by removing protocol and trailing slashes
 * @param {string} homeServer - the homeserver URL to clean
 * @returns {string} cleaned homeserver URL
 */
export function cleanMatrixHomeServerUrl(homeServer: string): string {
  return homeServer.replace(/^(https?:\/\/)/, "").replace(/\/$/, "");
}

/**
 * Generates a room name from an account address, used for matrix user room where user can manage their own data
 * @param {string} address - the address of the user
 * @param {string} postpend - the postpend of the room name (for testing)
 * @returns {string} roomName
 */
export function generateUserRoomNameFromAddress(
  address: string,
  postpend = ""
): string {
  return "did-ixo-" + address + postpend;
}

/**
 * Generates a room alias from an account address, used for matrix user room where user can manage their own data
 * @param {string} address - the address of the user
 * @param {string} homeServerUrl - the home server URL for the room alias
 * @returns {string} roomAlias
 */
export function generateUserRoomAliasFromAddress(
  address: string,
  homeServerUrl: string
): string {
  return (
    "#" +
    generateUserRoomNameFromAddress(address) +
    ":" +
    cleanMatrixHomeServerUrl(homeServerUrl)
  );
}

/**
 * Get the base URL for a given servername.
 * @param servername The servername to get the base URL for.
 * @returns The base URL for the servername.
 */
export async function getBaseUrl(servername: string): Promise<string> {
  let protocol = "https://";
  if (/^https?:\/\//.test(servername)) {
    protocol = "";
  }
  const serverDiscoveryUrl = `${protocol}${servername}${WELL_KNOWN_URI}`;
  try {
    const response = await fetch(serverDiscoveryUrl, { method: "GET" });
    const result = (await response.json()) as {
      "m.homeserver": { base_url: string };
    };
    const baseUrl = result?.["m.homeserver"]?.base_url;
    if (baseUrl === undefined) {
      throw new Error();
    }
    return baseUrl;
  } catch (e) {
    return `${protocol}${servername}`;
  }
}

/**
 * Normalize a username by removing leading '@' and trimming whitespace.
 * @param {string} rawUsername - The raw username to normalize.
 * @returns {string} The normalized username.
 */
export function normalizeUsername(rawUsername: string): string {
  const noLeadingAt =
    rawUsername.indexOf("@") === 0 ? rawUsername.substring(1) : rawUsername;
  return noLeadingAt.trim();
}

/**
 * Generates the authentication identifier for matrix login
 * @param {string} password - the password for the matrix account
 * @returns {object} authId - the authentication identifier
 */
export function getAuthId({
  userId,
  password,
}: {
  userId: string;
  password: string;
}): {
  type: string;
  password: string;
  identifier: { type: string; user: string };
} {
  return {
    type: "m.login.password",
    password,
    identifier: {
      type: "m.id.user",
      user: userId,
    },
  };
}

export async function getMatrixDetails({
  homeServerUrl,
  username,
  password,
}: {
  homeServerUrl: string;
  username: string;
  password: string;
}): Promise<AuthResponse> {
  const authResponse: AuthResponse = await mxLogin({
    homeServerUrl,
    username,
    password,
  });
  const matrixApiClient = getMatrixApiClientFromAuth(authResponse);
  const displayname = await matrixApiClient.profile.v1beta1.queryDisplayname(
    authResponse.userId,
    homeServerUrl,
    authResponse.accessToken
  );
  authResponse.displayName = displayname;
  const avatarUrl = await matrixApiClient.profile.v1beta1.queryAvatarUrl(
    authResponse.userId,
    homeServerUrl,
    authResponse.accessToken
  );
  authResponse.avatarUrl = avatarUrl;
  return authResponse;
}

export async function setMatrixDisplayName({
  homeServerUrl,
  username,
  password,
  newDisplayName,
}: {
  homeServerUrl: string;
  username: string;
  password: string;
  newDisplayName: string;
}): Promise<AuthResponse> {
  logger.info(
    {
      homeServerUrl,
      username,
      newDisplayName,
    },
    "Setting Matrix display name"
  );

  const authResponse: AuthResponse = await getMatrixDetails({
    homeServerUrl,
    username,
    password,
  });

  logger.debug(
    {
      userId: authResponse.userId,
      currentDisplayName: authResponse.displayName,
    },
    "Got Matrix auth response for display name update"
  );

  const matrixApiClient = getMatrixApiClientFromAuth(authResponse);

  logger.debug("Created Matrix API client for display name update");

  await matrixApiClient.profile.v1beta1.setDisplayname(
    authResponse.userId,
    newDisplayName
  );
  authResponse.displayName = newDisplayName;

  logger.info(
    {
      userId: authResponse.userId,
      newDisplayName,
    },
    "Matrix display name updated successfully"
  );

  return authResponse;
}
