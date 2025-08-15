export enum CHAIN_NETWORK_TYPE {
  MAINNET = "mainnet",
  TESTNET = "testnet",
  DEVNET = "devnet",
  LOCAL = "local",
}

export const DefaultChainNetwork = (process.env.CHAIN_NETWORK ||
  "devnet") as CHAIN_NETWORK_TYPE;

export const BlocksyncUrls: { [network in CHAIN_NETWORK_TYPE]: string } = {
  [CHAIN_NETWORK_TYPE.MAINNET]: "https://blocksync-graphql.ixo.earth",
  [CHAIN_NETWORK_TYPE.TESTNET]: "https://testnet-blocksync-graphql.ixo.earth",
  [CHAIN_NETWORK_TYPE.DEVNET]: "https://devnet-blocksync-graphql.ixo.earth",
  [CHAIN_NETWORK_TYPE.LOCAL]: "http://localhost:8083",
};
export const BLOCKSYNC_URL = BlocksyncUrls[DefaultChainNetwork];

export const CHAIN_RPC = {
  [CHAIN_NETWORK_TYPE.MAINNET]: "https://impacthub.ixo.world/rpc/",
  [CHAIN_NETWORK_TYPE.TESTNET]: "https://testnet.ixo.earth/rpc/",
  [CHAIN_NETWORK_TYPE.DEVNET]: "https://devnet.ixo.earth/rpc/",
  [CHAIN_NETWORK_TYPE.LOCAL]: "http://localhost:26657",
};
export const CHAIN_RPC_URL = CHAIN_RPC[DefaultChainNetwork];

export const CHAIN_IDS: { [network in CHAIN_NETWORK_TYPE]: string } = {
  [CHAIN_NETWORK_TYPE.MAINNET]: "ixo-5",
  [CHAIN_NETWORK_TYPE.TESTNET]: "pandora-8",
  [CHAIN_NETWORK_TYPE.DEVNET]: "devnet-1",
  [CHAIN_NETWORK_TYPE.LOCAL]: "devnet-1",
};
export const CHAIN_ID = CHAIN_IDS[DefaultChainNetwork];

export const FEEGRANT_URLS: { [network in CHAIN_NETWORK_TYPE]: string } = {
  [CHAIN_NETWORK_TYPE.MAINNET]: "https://feegrant.ixo.world",
  [CHAIN_NETWORK_TYPE.TESTNET]: "https://feegrant.testnet.ixo.earth",
  [CHAIN_NETWORK_TYPE.DEVNET]: "https://feegrant.devnet.ixo.earth",
  [CHAIN_NETWORK_TYPE.LOCAL]: "http://localhost:3000",
};
export const FEEGRANT_URL = FEEGRANT_URLS[DefaultChainNetwork];

export const FEEGRANT_AUTHS: { [network in CHAIN_NETWORK_TYPE]: string } = {
  [CHAIN_NETWORK_TYPE.MAINNET]: process.env.FEEGRANT_AUTH_MAINNET ?? "",
  [CHAIN_NETWORK_TYPE.TESTNET]: process.env.FEEGRANT_AUTH_TESTNET ?? "",
  [CHAIN_NETWORK_TYPE.DEVNET]: process.env.FEEGRANT_AUTH_DEVNET ?? "",
  [CHAIN_NETWORK_TYPE.LOCAL]: process.env.FEEGRANT_AUTH_LOCAL ?? "",
};
export const FEEGRANT_AUTH = FEEGRANT_AUTHS[DefaultChainNetwork];
