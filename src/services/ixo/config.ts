/**
 * Simple IXO Account Configuration
 *
 * Validates required environment variables for IXO account creation.
 * Much simpler than the overengineered version!
 */

import {
  CHAIN_NETWORK_TYPE,
  DefaultChainNetwork,
  CHAIN_RPC_URL,
  FEEGRANT_URLS,
  FEEGRANT_AUTHS,
} from "../../constants/ixo-blockchain.js";

export interface IxoConfig {
  defaultChainNetwork: CHAIN_NETWORK_TYPE;
  chainRpcUrl: string;
  feegrantServiceApiKey: string;
  feegrantServiceUrl: string;
  feegrantGranter: string;
  matrixHomeserverUrl: string;
  roomBotUrl: string;
}

/**
 * Gets and validates IXO configuration from environment variables
 * @param overrides - Optional config overrides
 * @returns Validated configuration object
 * @throws Error if required config is missing
 */
export function getIxoConfig(overrides: Partial<IxoConfig> = {}): IxoConfig {
  const defaultChainNetwork = (overrides.defaultChainNetwork ||
    (process.env.CHAIN_NETWORK as CHAIN_NETWORK_TYPE) ||
    DefaultChainNetwork) as CHAIN_NETWORK_TYPE;

  const config = {
    defaultChainNetwork,
    chainRpcUrl:
      overrides.chainRpcUrl || process.env.CHAIN_RPC_URL || CHAIN_RPC_URL,
    feegrantServiceApiKey:
      overrides.feegrantServiceApiKey ||
      process.env.FEEGRANT_AUTH ||
      FEEGRANT_AUTHS[defaultChainNetwork],
    feegrantServiceUrl:
      overrides.feegrantServiceUrl ||
      process.env.FEEGRANT_URL ||
      FEEGRANT_URLS[defaultChainNetwork],
    feegrantGranter: overrides.feegrantGranter || process.env.FEEGRANT_GRANTER,
    matrixHomeserverUrl:
      overrides.matrixHomeserverUrl || process.env.MATRIX_HOME_SERVER,
    roomBotUrl: overrides.roomBotUrl || process.env.MATRIX_BOT_URL,
  };

  // Check required fields
  const missing = Object.entries(config)
    /*eslint-disable-next-line @typescript-eslint/no-unused-vars */
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing required IXO config: ${missing.join(", ")}`);
  }

  return config as IxoConfig;
}
