import { IxoConfig } from "../services/ixo/config.js";
import { getQueryClient } from "../lib/cosmos/queryClient.js";
import { Grant } from "@ixo/impactxclient-sdk/types/codegen/cosmos/feegrant/v1beta1/feegrant.js";
import { createRegistry } from "@ixo/impactxclient-sdk";
import { DecodeObject } from "@cosmjs/proto-signing";
import { convertTimestampObjectToTimestamp } from "./timestamp.js";
import { Coin } from "@cosmjs/proto-signing";
import { Timestamp } from "@ixo/impactxclient-sdk/types/codegen/google/protobuf/timestamp.js";
import { createModuleLogger } from "../services/logger.js";

const logger = createModuleLogger("feegrant");

export enum FeegrantTypes {
  BASIC_ALLOWANCE = "BasicAllowance",
  PERIODIC_ALLOWANCE = "PeriodicAllowance",
}

export const FEEGRANT_TYPES: Record<FeegrantTypes, string> = {
  BasicAllowance: "/cosmos.feegrant.v1beta1.BasicAllowance",
  PeriodicAllowance: "/cosmos.feegrant.v1beta1.PeriodicAllowance",
};

export async function grantFeegrant(
  config: IxoConfig,
  ixoAddress: string
): Promise<boolean> {
  logger.debug({ ixoAddress }, "grantFeegrant::");

  const apiKey = config.feegrantServiceApiKey;
  const url = config.feegrantServiceUrl;
  const response = await fetch(`${url}/feegrant/${ixoAddress}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  logger.debug({ response }, "grantFeegrant::response");

  const responseBody = await response.text();
  if (responseBody.includes("fee allowance already exists")) {
    return false;
  }
  if (!response.ok || responseBody.includes("failed to execute message")) {
    throw new Error(`Failed to issue feegrant: ${responseBody}`);
  }
  return true;
}

export const isAllowanceExpired = (expiration: number | Timestamp) => {
  if (expiration === null || expiration === undefined) {
    return false;
  }
  const expirationTimestamp =
    typeof expiration === "object"
      ? convertTimestampObjectToTimestamp(expiration)
      : expiration;
  if (expirationTimestamp === undefined || expirationTimestamp === null) {
    // failed to decode or convert - assume expired
    return true;
  }
  return expirationTimestamp < Date.now();
};

export const isAllowanceLimitReached = (limit: number | string | Coin) => {
  if (limit === null || limit === undefined) {
    return false;
  }
  const limitAmount =
    typeof limit === "object"
      ? Number(limit?.amount ?? 0)
      : typeof limit === "string"
        ? Number(limit ?? 0)
        : limit;
  return limitAmount <= 0.0005;
};

export async function queryAddressAllowances(address: string) {
  try {
    const queryClient = await getQueryClient();
    const allowancesResponse =
      await queryClient.cosmos.feegrant.v1beta1.allowances({
        grantee: address,
      });
    return allowancesResponse?.allowances ?? [];
  } catch (error) {
    console.error("queryAddressAllowances::", (error as Error).message);
    return undefined;
  }
}

export const decodeGrants = (grants: Grant[]) => {
  const registry = createRegistry();

  return (grants ?? []).map(grant => {
    const allowance = grant.allowance as DecodeObject;
    const decodedAllowance = registry.decode(allowance);
    // decodedAllowance.
    switch (allowance.typeUrl) {
      case FEEGRANT_TYPES.BasicAllowance:
        return {
          granter: grant.granter,
          grantee: grant.grantee,
          type: FEEGRANT_TYPES.BasicAllowance,
          expiration: decodedAllowance.expiration
            ? convertTimestampObjectToTimestamp(decodedAllowance.expiration)
            : null,
          limit: decodedAllowance.spendLimit?.length
            ? decodedAllowance.spendLimit.find(
                (limit: Coin) => limit.denom === "uixo"
              )?.amount
            : null,
          msgs: [],
        };
      case FEEGRANT_TYPES.PeriodicAllowance:
        return {
          granter: grant.granter,
          grantee: grant.grantee,
          type: FEEGRANT_TYPES.PeriodicAllowance,
          expiration: decodedAllowance.basic?.expiration
            ? convertTimestampObjectToTimestamp(
                decodedAllowance.basic.expiration
              )
            : null,
          limit: decodedAllowance?.periodCanSpend
            ? decodedAllowance?.periodCanSpend?.find(
                (limit: Coin) => limit.denom === "uixo"
              )?.amount
            : decodedAllowance?.basic?.spendLimit?.length
              ? decodedAllowance?.basic?.spendLimit?.find(
                  (limit: Coin) => limit.denom === "uixo"
                )?.amount
              : null,
          msgs: [],
        };
      default:
        return {
          type: allowance.typeUrl,
          granter: grant.granter,
          grantee: grant.grantee,
          expiration: decodedAllowance.expiration
            ? convertTimestampObjectToTimestamp(decodedAllowance.expiration)
            : decodedAllowance.basic?.expiration
              ? convertTimestampObjectToTimestamp(
                  decodedAllowance.basic.expiration
                )
              : null,
          limit: decodedAllowance.spendLimit?.length
            ? decodedAllowance.spendLimit.find(
                (limit: Coin) => limit.denom === "uixo"
              )?.amount
            : decodedAllowance?.periodCanSpend
              ? decodedAllowance?.periodCanSpend?.find(
                  (limit: Coin) => limit.denom === "uixo"
                )?.amount
              : decodedAllowance?.basic?.spendLimit?.length
                ? decodedAllowance?.basic?.spendLimit?.find(
                    (limit: Coin) => limit.denom === "uixo"
                  )?.amount
                : null,
          msgs: decodedAllowance.allowedMessages,
        };
    }
  });
};
