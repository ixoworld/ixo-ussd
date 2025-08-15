/**
 * DID (Decentralized Identifier) utilities for IXO
 */
import {
  createQueryClient,
  ixo,
  utils,
  customMessages,
  createSigningClient,
} from "@ixo/impactxclient-sdk";
import { OfflineSigner } from "@cosmjs/proto-signing";
import { createModuleLogger } from "../services/logger.js";

// Create a module-specific logger
const logger = createModuleLogger("did-utils");

export async function checkIidDocumentExists(did: string, chainRpcUrl: string) {
  try {
    logger.debug(
      {
        did,
      },
      "Checking if IID document exists"
    );
    const queryClient = await createQueryClient(chainRpcUrl);
    const iidDocumentResponse = await queryClient.ixo.iid.v1beta1.iidDocument({
      id: did,
    });
    return !!iidDocumentResponse?.iidDocument?.id;
  } catch (error) {
    if ((error as Error).message?.includes("did document not found")) {
      logger.debug(
        {
          did,
        },
        "IID document not found"
      );
      return false;
    }
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        did,
      },
      "Error checking IID document"
    );
    throw error;
  }
}

export async function createIidDocument(
  did: string,
  offlineSigner: OfflineSigner,
  chainRpcUrl: string,
  feegrantGranter?: string
) {
  logger.debug(
    {
      did,
      feegrantGranter: feegrantGranter || "none",
    },
    "Creating IID document"
  );

  const accounts = await offlineSigner.getAccounts();
  const { address, pubkey } = accounts[0];
  logger.debug(
    {
      address,
      did,
    },
    "Using address for IID document creation"
  );

  // Create signing client - using direct import instead of utils.client.createSigningClient
  const client = await createSigningClient(chainRpcUrl, offlineSigner);

  // Create IID document
  const msg = {
    typeUrl: "/ixo.iid.v1beta1.MsgCreateIidDocument",
    value: ixo.iid.v1beta1.MsgCreateIidDocument.fromPartial({
      id: did,
      verifications: customMessages.iid.createIidVerificationMethods({
        did: did,
        pubkey: pubkey,
        address: address,
        controller: did,
        type: "secp",
      }),
      signer: address,
      controllers: [did],
    }),
  };

  // Broadcast transaction with feegrant if available
  let fee;
  if (feegrantGranter) {
    logger.debug(
      {
        feegrantGranter,
        address,
      },
      "Using feegrant for transaction"
    );
    fee = {
      amount: [{ denom: "uixo", amount: "5000" }],
      gas: "200000",
      granter: feegrantGranter,
    };
  } else {
    logger.debug({}, "No feegrant specified, using regular fee");
    fee = {
      amount: [{ denom: "uixo", amount: "5000" }],
      gas: "200000",
    };
  }

  try {
    logger.debug(
      {
        did,
        address,
        hasFeegrant: !!feegrantGranter,
      },
      "Broadcasting transaction to create IID document"
    );

    const result = await client.signAndBroadcast(address, [msg], fee);

    logger.info(
      {
        transactionHash: result.transactionHash,
        height: result.height,
        did,
        address,
      },
      "IID document created successfully"
    );
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(
      {
        error: errorMessage,
        did,
        address,
        hasFeegrant: !!feegrantGranter,
      },
      "Error creating IID document"
    );

    // If it's a sequence error and we have a fee grant, provide more context
    if (errorMessage.includes("does not exist on chain") && feegrantGranter) {
      throw new Error(
        `Account ${address} does not exist on chain. This may indicate that the fee grant from ${feegrantGranter} has not been properly set up or propagated. Original error: ${errorMessage}`
      );
    }

    throw error;
  }
}

export async function createIidDocumentIfNotExists({
  address,
  offlineSigner,
  chainRpcUrl,
  feegrantGranter,
}: {
  address: string;
  offlineSigner: OfflineSigner;
  chainRpcUrl: string;
  feegrantGranter?: string;
}) {
  if (!address) {
    throw new Error("Address is required to generate DID");
  }

  const did = utils.did.generateSecpDid(address);
  logger.debug(
    {
      did,
      address,
    },
    "Generated DID for address"
  );

  const didExists = await checkIidDocumentExists(did, chainRpcUrl);

  if (!didExists) {
    logger.debug(
      {
        did,
      },
      "IID document does not exist, creating"
    );
    if (!offlineSigner) {
      throw new Error("Cannot create iid document without offline signer");
    }
    await createIidDocument(did, offlineSigner, chainRpcUrl, feegrantGranter);
  } else {
    logger.debug(
      {
        did,
      },
      "IID document already exists, skipping creation"
    );
  }

  return did;
}
