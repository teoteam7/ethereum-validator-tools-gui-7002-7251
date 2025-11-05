export const EIP7002_PREDEPLOY = "0x00000961Ef480Eb55e80D19ad83579A64c007002" as const;

export const DOMAIN_BLS_TO_EXECUTION_CHANGE = new Uint8Array([0x0A, 0x00, 0x00, 0x00]);

export type KnownNetwork = "mainnet" | "holesky";

export const KNOWN_GENESIS_VALIDATORS_ROOT: Record<KnownNetwork, string> = {
  mainnet: "0xcf8e0d4e9587369b2301d0790347320302cc0943d5a1884560367e8208d920f2",
  holesky: "0x9143aa7c615a7f7115e2b6aac319c03529df8242ae705fba9df39b79c59fa8b1",
};
