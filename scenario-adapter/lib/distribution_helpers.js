"use strict";

const { ethers } = require("ethers");
const {
  ROLE,
  walletAt,
  loadArtifact,
  selectorsForAbi,
  sendAndWait,
  deployBaseDiamondWithAccess,
  deploy,
  ensureRole
} = require("./reentrancy_real_helpers");

const TOKEN_UNIT = 10n ** 10n;

function hashLeaf(account, allocation) {
  return ethers.keccak256(ethers.solidityPacked(["address", "uint256"], [account, allocation]));
}

function sortPair(a, b) {
  return BigInt(a) < BigInt(b) ? [a, b] : [b, a];
}

function hashPair(a, b) {
  const [left, right] = sortPair(a, b);
  return ethers.keccak256(ethers.solidityPacked(["bytes32", "bytes32"], [left, right]));
}

function buildMerkle(leaves) {
  if (leaves.length === 0) throw new Error("leaves required");
  let level = [...leaves];
  const levels = [level];
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) {
      const left = level[i];
      const right = i + 1 < level.length ? level[i + 1] : level[i];
      next.push(hashPair(left, right));
    }
    levels.push(next);
    level = next;
  }
  return { root: level[0], levels };
}

function getProof(leaves, index) {
  const { levels } = buildMerkle(leaves);
  const proof = [];
  let idx = index;
  for (let depth = 0; depth < levels.length - 1; depth++) {
    const level = levels[depth];
    const pairIndex = idx ^ 1;
    if (pairIndex < level.length) {
      proof.push(level[pairIndex]);
    }
    idx = Math.floor(idx / 2);
  }
  return proof;
}

async function bootstrapDistribution(rpcUrl) {
  const { provider, founder, founderAddress, diamondAddress, diamondCut, access } = await deployBaseDiamondWithAccess(rpcUrl);
  await ensureRole(access, founder, ROLE.TIMELOCK_ROLE, "TIMELOCK_ROLE");

  const tokenArtifact = loadArtifact("out/TokenSupplyFacet.sol/TokenSupplyFacet.json");
  const distributionArtifact = loadArtifact("out/CommunityRewardsFacet.sol/CommunityRewardsFacet.json");
  const emergencyArtifact = loadArtifact("out/EmergencyFacet.sol/EmergencyFacet.json");

  const tokenFacet = await deploy(
    new ethers.ContractFactory(tokenArtifact.abi, tokenArtifact.bytecode.object, founder),
    "TokenSupplyFacet"
  );
  await sendAndWait(
    diamondCut.diamondCut(
      [{ facetAddress: await tokenFacet.getAddress(), action: 0, functionSelectors: selectorsForAbi(tokenArtifact.abi) }],
      ethers.ZeroAddress,
      "0x",
      { gasLimit: 12_000_000 }
    ),
    "diamondCut:addTokenSupplyFacet"
  );

  const token = new ethers.Contract(diamondAddress, tokenArtifact.abi, founder);
  await sendAndWait(token.initializeToken({ gasLimit: 3_000_000 }), "initializeToken");

  const distributionFacet = await deploy(
    new ethers.ContractFactory(distributionArtifact.abi, distributionArtifact.bytecode.object, founder),
    "CommunityRewardsFacet"
  );
  await sendAndWait(
    diamondCut.diamondCut(
      [{ facetAddress: await distributionFacet.getAddress(), action: 0, functionSelectors: selectorsForAbi(distributionArtifact.abi) }],
      ethers.ZeroAddress,
      "0x",
      { gasLimit: 12_000_000 }
    ),
    "diamondCut:addCommunityRewardsFacet"
  );

  return {
    provider,
    founder,
    founderAddress,
    diamondAddress,
    access,
    token,
    emergency: new ethers.Contract(diamondAddress, emergencyArtifact.abi, founder),
    rewards: new ethers.Contract(diamondAddress, distributionArtifact.abi, founder),
    user1: walletAt(provider, 1),
    user2: walletAt(provider, 2),
    TOKEN_UNIT,
    hashLeaf,
    buildMerkle,
    getProof
  };
}

module.exports = {
  TOKEN_UNIT,
  hashLeaf,
  buildMerkle,
  getProof,
  bootstrapDistribution
};
