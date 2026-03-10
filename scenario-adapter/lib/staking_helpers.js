"use strict";

const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const { scenarioFundingWei } = require("./runtime_config");
const { ensureEthBalance } = require("./validation_safety");

const DAY = 24 * 60 * 60;
const TOKEN_UNIT = 10n ** 10n;
const PLATFORM_ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("PLATFORM_ADMIN_ROLE"));
const TIMELOCK_ROLE = ethers.keccak256(ethers.toUtf8Bytes("TIMELOCK_ROLE"));

function loadArtifact(relPath) {
  const file = path.join(process.cwd(), relPath);
  if (!fs.existsSync(file)) throw new Error(`Missing artifact: ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

async function sendAndWait(txPromise, label) {
  const tx = await txPromise;
  console.log(`[tx] ${label} from=${tx.from} nonce=${tx.nonce} sel=${(tx.data || "0x").slice(0, 10)} hash=${tx.hash}`);
  for (let i = 0; i < 120; i++) {
    const receipt = await tx.provider.getTransactionReceipt(tx.hash);
    if (receipt) {
      if (receipt.status !== 1n && receipt.status !== 1) {
        throw new Error(`${label}: transaction reverted hash=${tx.hash}`);
      }
      return receipt;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`${label}: receipt timeout hash=${tx.hash}`);
}

async function expectRevert(sendFn, label) {
  let err;
  try {
    await sendAndWait(sendFn(), label);
  } catch (e) {
    err = e;
  }
  if (!err) throw new Error(`${label}: expected revert`);
  const data = err?.data || err?.info?.error?.data || "<none>";
  console.log(`[expect-revert-ok] ${label} data=${data}`);
  return err;
}

async function advanceTime(provider, seconds) {
  await provider.send("evm_increaseTime", [seconds]);
  await provider.send("evm_mine", []);
}

async function ensureRole(access, signer, roleId, account, label) {
  if (await access.hasRole(roleId, account)) return;
  await sendAndWait(access.connect(signer).grantRole(roleId, account, ethers.MaxUint256), `grantRole:${label}`);
}

async function ensurePlatformAdmin(access, founder, founderAddress) {
  if (await access.hasRole(PLATFORM_ADMIN_ROLE, founderAddress)) return;
  await ensureRole(access, founder, TIMELOCK_ROLE, founderAddress, "TIMELOCK_ROLE");
  await ensureRole(access, founder, PLATFORM_ADMIN_ROLE, founderAddress, "PLATFORM_ADMIN_ROLE");
}

async function forceDegradedMode(echo, staking, founder, provider, maxStakePerWallet) {
  await sendAndWait(
    staking.connect(founder).setDegradedModeConfig(true, 1, maxStakePerWallet, { gasLimit: 1_500_000 }),
    "setDegradedModeConfig"
  );
  await sendAndWait(echo.connect(founder).setOracleStalenessConfig(1, { gasLimit: 1_000_000 }), "setOracleStalenessConfig:1s");
  await advanceTime(provider, 2);
  const healthy = await echo.isOracleHealthy();
  if (healthy) throw new Error("oracle should be stale so degraded mode is active");
}

async function createContext({ rpcUrl, diamondAddress, privateKey }) {
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const founder = new ethers.NonceManager(new ethers.Wallet(privateKey, provider));
  const founderAddress = await founder.getAddress();

  const access = new ethers.Contract(diamondAddress, loadArtifact("out/AccessControlFacet.sol/AccessControlFacet.json").abi, provider);
  const token = new ethers.Contract(diamondAddress, loadArtifact("out/TokenSupplyFacet.sol/TokenSupplyFacet.json").abi, provider);
  const staking = new ethers.Contract(diamondAddress, loadArtifact("out/StakingFacet.sol/StakingFacet.json").abi, provider);
  const echo = new ethers.Contract(diamondAddress, loadArtifact("out/EchoScoreFacetV3.sol/EchoScoreFacetV3.json").abi, provider);

  return { provider, founder, founderAddress, access, token, staking, echo };
}

async function createUser(provider, founder, localEthAmount = "1", liveEthAmount = "0.00005") {
  const wallet = new ethers.NonceManager(ethers.Wallet.createRandom().connect(provider));
  const address = await wallet.getAddress();
  await ensureEthBalance(founder, address, scenarioFundingWei(localEthAmount, liveEthAmount), `fundETH:${address}`);
  return { wallet, address };
}

async function transferAndApprove(token, founder, userWallet, userAddress, diamondAddress, amount, label) {
  await sendAndWait(token.connect(founder).transfer(userAddress, amount), `transfer:${label}`);
  await sendAndWait(token.connect(userWallet).approve(diamondAddress, amount), `approve:${label}`);
}

module.exports = {
  DAY,
  TOKEN_UNIT,
  PLATFORM_ADMIN_ROLE,
  TIMELOCK_ROLE,
  loadArtifact,
  sendAndWait,
  expectRevert,
  advanceTime,
  ensureRole,
  ensurePlatformAdmin,
  forceDegradedMode,
  createContext,
  createUser,
  transferAndApprove
};
