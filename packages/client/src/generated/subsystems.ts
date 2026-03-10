import coreAbi from "../../../../generated/abis/subsystems/core.json";
import governanceAbi from "../../../../generated/abis/subsystems/governance.json";
import marketAbi from "../../../../generated/abis/subsystems/market.json";
import tokenomicsAbi from "../../../../generated/abis/subsystems/tokenomics.json";
import voiceAbi from "../../../../generated/abis/subsystems/voice.json";

export const subsystemRegistry = {
  core: { name: "core", abi: coreAbi },
  governance: { name: "governance", abi: governanceAbi },
  market: { name: "market", abi: marketAbi },
  tokenomics: { name: "tokenomics", abi: tokenomicsAbi },
  voice: { name: "voice", abi: voiceAbi },
} as const;
