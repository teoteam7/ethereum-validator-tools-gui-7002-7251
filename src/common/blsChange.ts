import { computeDomain, computeSigningRootForBlsToExecutionChange } from "./ssz.js";
import { DOMAIN_BLS_TO_EXECUTION_CHANGE } from "./constants.js";
import * as bls from "@noble/bls12-381";

export type BlsToExecInput = {
  validatorIndex: bigint;
  fromBlsPubkeyHex: string;
  toExecutionAddress: string;
  genesisValidatorsRoot: string;
  blsWithdrawalPrivkeyHex: string;
};

export type SignedBlsToExec = {
  message: {
    validator_index: string;
    from_bls_pubkey: string;
    to_execution_address: string;
  };
  signature: string;
};

function hexToBytes(hex: string): Uint8Array {
  if (hex.startsWith("0x")) hex = hex.slice(2);
  if (hex.length % 2 !== 0) throw new Error("Invalid hex length");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function normalizeHex(hex: string): string {
  return hex.startsWith("0x") ? hex : "0x" + hex;
}

export async function buildAndSignBlsToExecutionChange(input: BlsToExecInput): Promise<SignedBlsToExec> {
  const forkVersion = new Uint8Array([0, 0, 0, 0]);
  const gvr = hexToBytes(input.genesisValidatorsRoot);
  if (gvr.length !== 32) throw new Error("genesisValidatorsRoot must be 32 bytes");
  const domain = computeDomain(DOMAIN_BLS_TO_EXECUTION_CHANGE, forkVersion, gvr);

  const fromPub = hexToBytes(input.fromBlsPubkeyHex);
  if (fromPub.length !== 48) throw new Error("fromBlsPubkey must be 48 bytes");
  const execAddr = hexToBytes(input.toExecutionAddress);
  if (execAddr.length !== 20) throw new Error("toExecutionAddress must be 20 bytes");

  const signingRoot = computeSigningRootForBlsToExecutionChange(
    {
      validator_index: input.validatorIndex,
      from_bls_pubkey: fromPub,
      to_execution_address: execAddr,
    },
    domain
  );

  const sk = hexToBytes(input.blsWithdrawalPrivkeyHex);
  if (sk.length !== 32) throw new Error("BLS withdrawal private key must be 32 bytes");
  const signature = await bls.sign(signingRoot, sk);

  return {
    message: {
      validator_index: input.validatorIndex.toString(),
      from_bls_pubkey: normalizeHex(Buffer.from(fromPub).toString("hex")),
      to_execution_address: normalizeHex(Buffer.from(execAddr).toString("hex")),
    },
    signature: normalizeHex(Buffer.from(signature).toString("hex")),
  };
}

export function asBeaconPoolArrayPayload(signed: SignedBlsToExec) {
  return { data: [signed] };
}
