"use strict";

const { ethers } = require("ethers");

const coder = ethers.AbiCoder.defaultAbiCoder();

function hashVoiceQualityData(data) {
  return ethers.keccak256(
    coder.encode(
      ["uint256", "uint256", "uint256", "uint256", "uint256", "uint256"],
      [
        data.completenessPercentage,
        data.sampleRate,
        data.speechDuration,
        data.hnr,
        data.jitterLocal,
        data.shimmerLocal
      ]
    )
  );
}

function hashEngagementData(data) {
  return ethers.keccak256(
    coder.encode(
      ["uint256", "uint256", "uint256", "uint256", "uint256", "uint256"],
      [data.viewCount, data.likeCount, data.playCount, data.ratingAverage, data.ratingCount, data.assetAge]
    )
  );
}

function hashGovernanceData(data) {
  return ethers.keccak256(
    coder.encode(["uint256", "uint256", "uint256"], [data.proposalsCreated, data.proposalsActiveOrSuccess, data.votesCast])
  );
}

function hashContributionData(data) {
  return ethers.keccak256(
    coder.encode(
      ["uint256", "uint256", "uint256", "bool", "bool"],
      [data.datasetCount, data.totalAssetCount, data.totalDuration, data.hasCommercialDataset, data.hasHighQualityDataset]
    )
  );
}

function hashMarketplaceData(data) {
  return ethers.keccak256(
    coder.encode(
      ["uint256", "uint256", "uint256", "uint256", "uint256", "uint256"],
      [
        data.datasetSalesCount,
        data.datasetSalesVolume,
        data.assetSalesCount,
        data.assetSalesVolume,
        data.royaltiesRealized,
        data.royaltyPaymentsCount
      ]
    )
  );
}

function constructEchoScoreMessageHash(update) {
  return ethers.keccak256(
    coder.encode(
      ["bytes32", "bytes32", "bytes32", "bytes32", "bytes32", "bytes32", "uint256", "uint256"],
      [
        update.voiceHash,
        hashVoiceQualityData(update.qualityData),
        hashEngagementData(update.engagementData),
        hashGovernanceData(update.governanceData),
        hashContributionData(update.contributionData),
        hashMarketplaceData(update.marketplaceData),
        update.nonce ?? 0,
        update.timestamp
      ]
    )
  );
}

async function signEchoScoreUpdate(update, signer) {
  const messageHash = constructEchoScoreMessageHash(update);
  return signer.signMessage(ethers.getBytes(messageHash));
}

module.exports = {
  constructEchoScoreMessageHash,
  signEchoScoreUpdate
};
