import { createSigningClient } from "@ixo/impactxclient-sdk";
import { coins, DeliverTxResponse } from "@cosmjs/stargate";
import { getSecpClient } from "../../utils/secp.js";
import { createModuleLogger } from "../logger.js";

// Create a module-specific logger
const logger = createModuleLogger("ixo-transactions");

/**
 * Sends a specified amount of uixo from one account to another.
 *
 * This function handles the creation of a signing client, message construction,
 * and broadcasting the transaction to the IXO blockchain.
 *
 * @param fromMnemonic The mnemonic of the sender's account.
 * @param toAddress The recipient's IXO address.
 * @param amountInUixo The amount to send in uixo (e.g., "1000000" for 1 IXO).
 * @param chainRpcUrl The RPC URL of the IXO chain.
 * @param memo An optional memo for the transaction.
 * @returns A promise that resolves to the transaction response.
 */
export async function sendIxo(
  fromMnemonic: string,
  toAddress: string,
  amountInUixo: string,
  chainRpcUrl: string,
  memo: string = ""
): Promise<DeliverTxResponse> {
  if (!fromMnemonic || !toAddress || !amountInUixo || !chainRpcUrl) {
    throw new Error("Missing required arguments for sendIxo");
  }

  // 1. Create a wallet and signing client from the sender's mnemonic
  const wallet = await getSecpClient(fromMnemonic);
  const signingClient = await createSigningClient(chainRpcUrl, wallet);
  const fromAddress = wallet.baseAccount.address;

  // 2. Define the amount and fee
  const amount = coins(amountInUixo, "uixo");
  const fee = {
    amount: coins("5000", "uixo"), // Standard fee
    gas: "200000",
  };

  logger.info(
    {
      fromAddress,
      toAddress,
      amountInUixo,
      memo,
      feeAmount: "5000",
      gas: "200000",
    },
    "Attempting to send IXO tokens"
  );

  // 3. Create the MsgSend message
  const msg = {
    typeUrl: "/cosmos.bank.v1beta1.MsgSend",
    value: {
      fromAddress: fromAddress,
      toAddress: toAddress,
      amount: amount,
    },
  };

  // 4. Sign and broadcast the transaction
  try {
    const result = await signingClient.signAndBroadcast(
      fromAddress,
      [msg],
      fee,
      memo
    );

    logger.info(
      {
        transactionHash: result.transactionHash,
        height: result.height,
        fromAddress,
        toAddress,
        amountInUixo,
      },
      "IXO transaction completed successfully"
    );

    return result;
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        fromAddress,
        toAddress,
        amountInUixo,
      },
      "Failed to send IXO tokens"
    );
    throw error;
  }
}
