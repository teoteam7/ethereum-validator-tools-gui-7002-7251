import * as ssz from "@chainsafe/ssz";

const S: any = ssz;

const ForkDataType = {
  fields: [
    ["currentVersion", "bytes4"],
    ["genesisValidatorsRoot", "bytes32"],
  ],
} as const;

const SigningDataType = {
  fields: [
    ["object_root", "bytes32"],
    ["domain", "bytes32"],
  ],
} as const;

const BLSToExecutionChangeType = {
  fields: [
    ["validator_index", "uint64"],
    ["from_bls_pubkey", "bytes48"],
    ["to_execution_address", "bytes20"],
  ],
} as const;

export function computeForkDataRoot(
  currentVersion: Uint8Array,
  genesisValidatorsRoot: Uint8Array
): Uint8Array {
  const root = S.hashTreeRoot(
    { currentVersion, genesisValidatorsRoot },
    ForkDataType
  );
  return root instanceof Uint8Array ? root : new Uint8Array(root);
}

export function computeDomain(
  domainType: Uint8Array,
  forkVersion: Uint8Array,
  genesisValidatorsRoot: Uint8Array
): Uint8Array {
  const forkDataRoot = computeForkDataRoot(forkVersion, genesisValidatorsRoot);
  const domain = new Uint8Array(32);
  domain.set(domainType, 0);
  domain.set(forkDataRoot.slice(0, 28), 4);
  return domain;
}

export function computeSigningRootForBlsToExecutionChange(
  message: {
    validator_index: bigint;
    from_bls_pubkey: Uint8Array;
    to_execution_address: Uint8Array;
  },
  domain: Uint8Array
): Uint8Array {
  const object_root = S.hashTreeRoot(message, BLSToExecutionChangeType);
  const root = S.hashTreeRoot({ object_root, domain }, SigningDataType);
  return root instanceof Uint8Array ? root : new Uint8Array(root);
}
