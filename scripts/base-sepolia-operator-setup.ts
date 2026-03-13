import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { Contract, JsonRpcProvider, Wallet, ZeroAddress, ethers, id } from "ethers";

import { createApiServer } from "../packages/api/src/app.js";
import { facetRegistry } from "../packages/client/src/generated/index.js";
import { loadRepoEnv, readConfigFromEnv } from "../packages/client/src/runtime/config.js";

type ApiCallOptions = {
  apiKey?: string;
  body?: unknown;
};

type FixtureStatus = "ready" | "partial" | "blocked";

type WalletSpec = {
  label: string;
  privateKey?: string;
};

const ONE_DAY = 24n * 60n * 60n;
const DEFAULT_NATIVE_MINIMUM = ethers.parseEther("0.00004");
const DEFAULT_USDC_MINIMUM = 25_000_000n;
const RUNTIME_DIR = path.resolve(".runtime");
const OUTPUT_PATH = path.join(RUNTIME_DIR, "base-sepolia-operator-fixtures.json");

function toJsonValue(value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map((entry) => toJsonValue(entry));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, toJsonValue(entry)]));
  }
  return value;
}

async function apiCall(port: number, method: string, route: string, options: ApiCallOptions = {}) {
  const response = await fetch(`http://127.0.0.1:${port}${route}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(options.apiKey ? { "x-api-key": options.apiKey } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const payload = await response.json().catch(() => null);
  return { status: response.status, payload };
}

function extractTxHash(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    throw new Error("missing tx payload");
  }
  const txHash = (payload as Record<string, unknown>).txHash;
  if (typeof txHash !== "string" || !txHash.startsWith("0x")) {
    throw new Error("missing txHash");
  }
  return txHash;
}

async function waitForReceipt(port: number, txHash: string): Promise<void> {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const response = await apiCall(port, "GET", `/v1/transactions/${txHash}`, { apiKey: "read-key" });
    const receipt = response.payload && typeof response.payload === "object"
      ? (response.payload as Record<string, unknown>).receipt as { status?: number | string } | undefined
      : undefined;
    if (response.status === 200 && receipt) {
      const status = receipt.status;
      if (status === 1 || status === "1") {
        return;
      }
      throw new Error(`transaction reverted: ${txHash}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`timed out waiting for receipt ${txHash}`);
}

function roleId(name: string): string {
  return id(name);
}

async function ensureNativeBalance(
  funder: Wallet,
  target: Wallet,
  minimum: bigint,
): Promise<{ funded: boolean; balance: string }> {
  const balance = await target.provider!.getBalance(target.address);
  if (balance >= minimum) {
    return { funded: false, balance: balance.toString() };
  }
  const delta = minimum - balance + ethers.parseEther("0.00001");
  const receipt = await (await funder.sendTransaction({ to: target.address, value: delta })).wait();
  if (!receipt || receipt.status !== 1) {
    throw new Error(`failed to top up native balance for ${target.address}`);
  }
  const updated = await target.provider!.getBalance(target.address);
  return { funded: true, balance: updated.toString() };
}

async function ensureRole(
  port: number,
  role: string,
  account: string,
): Promise<{ status: "present" | "granted" | "failed"; error?: string }> {
  const current = await apiCall(
    port,
    "GET",
    `/v1/access-control/queries/has-role?role=${encodeURIComponent(role)}&account=${encodeURIComponent(account)}`,
    { apiKey: "read-key" },
  );
  if (current.status === 200 && current.payload === true) {
    return { status: "present" };
  }
  const grant = await apiCall(port, "POST", "/v1/access-control/admin/grant-role", {
    apiKey: "founder-key",
    body: { role, account, expiryTime: ethers.MaxUint256.toString() },
  });
  if (grant.status !== 202) {
    return { status: "failed", error: JSON.stringify(grant.payload) };
  }
  await waitForReceipt(port, extractTxHash(grant.payload));
  return { status: "granted" };
}

async function main(): Promise<void> {
  const env = loadRepoEnv();
  const config = readConfigFromEnv(env);
  const provider = new JsonRpcProvider(config.cbdpRpcUrl, config.chainId);

  const founderSpec: WalletSpec = { label: "founder", privateKey: env.PRIVATE_KEY };
  const sellerSpec: WalletSpec = { label: "seller", privateKey: env.ORACLE_SIGNER_PRIVATE_KEY_1 ?? env.ORACLE_WALLET_PRIVATE_KEY ?? env.PRIVATE_KEY };
  const buyerSpec: WalletSpec = { label: "buyer", privateKey: env.ORACLE_SIGNER_PRIVATE_KEY_2 };
  const licenseeSpec: WalletSpec = { label: "licensee", privateKey: env.ORACLE_SIGNER_PRIVATE_KEY_3 };
  const transfereeSpec: WalletSpec = { label: "transferee", privateKey: env.ORACLE_SIGNER_PRIVATE_KEY_4 };
  const availableSpecs = [founderSpec, sellerSpec, buyerSpec, licenseeSpec, transfereeSpec].filter((entry) => entry.privateKey);
  if (!founderSpec.privateKey) {
    throw new Error("missing PRIVATE_KEY in repo .env");
  }

  const founder = new Wallet(founderSpec.privateKey, provider);
  const seller = new Wallet(sellerSpec.privateKey!, provider);
  const buyer = buyerSpec.privateKey ? new Wallet(buyerSpec.privateKey, provider) : null;
  const licensee = licenseeSpec.privateKey ? new Wallet(licenseeSpec.privateKey, provider) : null;
  const transferee = transfereeSpec.privateKey ? new Wallet(transfereeSpec.privateKey, provider) : null;

  process.env.API_LAYER_KEYS_JSON = JSON.stringify({
    "founder-key": { label: "founder", signerId: "founder", roles: ["service"], allowGasless: false },
    "read-key": { label: "reader", roles: ["service"], allowGasless: false },
    ...(seller ? { "seller-key": { label: "seller", signerId: "seller", roles: ["service"], allowGasless: false } } : {}),
    ...(buyer ? { "buyer-key": { label: "buyer", signerId: "buyer", roles: ["service"], allowGasless: false } } : {}),
    ...(licensee ? { "licensee-key": { label: "licensee", signerId: "licensee", roles: ["service"], allowGasless: false } } : {}),
    ...(transferee ? { "transferee-key": { label: "transferee", signerId: "transferee", roles: ["service"], allowGasless: false } } : {}),
  });
  process.env.API_LAYER_SIGNER_MAP_JSON = JSON.stringify({
    founder: founder.privateKey,
    seller: seller.privateKey,
    ...(buyer ? { buyer: buyer.privateKey } : {}),
    ...(licensee ? { licensee: licensee.privateKey } : {}),
    ...(transferee ? { transferee: transferee.privateKey } : {}),
  });

  const server = createApiServer({ port: 0 }).listen();
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 8787;

  try {
    const voiceAsset = new Contract(config.diamondAddress, facetRegistry.VoiceAssetFacet.abi, provider);
    const payment = new Contract(config.diamondAddress, facetRegistry.PaymentFacet.abi, provider);
    const accessControl = new Contract(config.diamondAddress, facetRegistry.AccessControlFacet.abi, provider);
    const governorFacet = new Contract(config.diamondAddress, facetRegistry.GovernorFacet.abi, provider);
    const proposalFacet = new Contract(config.diamondAddress, facetRegistry.ProposalFacet.abi, provider);
    const delegationFacet = new Contract(config.diamondAddress, facetRegistry.DelegationFacet.abi, provider);
    const tokenSupply = new Contract(config.diamondAddress, facetRegistry.TokenSupplyFacet.abi, provider);

    const usdcAddress = await payment.getUsdcToken();
    const erc20 = usdcAddress && usdcAddress !== ZeroAddress
    ? new Contract(
        usdcAddress,
        [
          "function balanceOf(address) view returns (uint256)",
          "function allowance(address,address) view returns (uint256)",
          "function transfer(address,uint256) returns (bool)",
        ],
        provider,
      )
    : null;

    const status: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    network: {
      chainId: config.chainId,
      rpcUrl: config.cbdpRpcUrl,
      diamondAddress: config.diamondAddress,
    },
    actors: {},
    marketplace: {},
    governance: {},
    licensing: {},
  };

    for (const entry of availableSpecs) {
    const wallet = new Wallet(entry.privateKey!, provider);
    status.actors[entry.label] = {
      address: wallet.address,
      nativeBalance: (await provider.getBalance(wallet.address)).toString(),
    };
  }

    if (buyer) {
    status.actors.buyer = {
      ...(status.actors.buyer as Record<string, unknown>),
      nativeTopUp: await ensureNativeBalance(seller, buyer, DEFAULT_NATIVE_MINIMUM),
    };
  }
    if (licensee) {
    status.actors.licensee = {
      ...(status.actors.licensee as Record<string, unknown>),
      nativeTopUp: await ensureNativeBalance(seller, licensee, DEFAULT_NATIVE_MINIMUM),
    };
  }
    if (transferee) {
    status.actors.transferee = {
      ...(status.actors.transferee as Record<string, unknown>),
      nativeTopUp: await ensureNativeBalance(seller, transferee, DEFAULT_NATIVE_MINIMUM),
    };
  }

    if (erc20 && buyer) {
    const balances = await Promise.all(
      availableSpecs.map(async (entry) => {
        const wallet = new Wallet(entry.privateKey!, provider);
        return {
          label: entry.label,
          address: wallet.address,
          balance: BigInt(await erc20.balanceOf(wallet.address)),
        };
      }),
    );
    const richest = balances.sort((left, right) => Number(right.balance - left.balance))[0];
    const buyerBalance = BigInt(await erc20.balanceOf(buyer.address));
    const buyerAllowance = BigInt(await erc20.allowance(buyer.address, config.diamondAddress));
    const usdcFunding: Record<string, unknown> = {
      token: usdcAddress,
      buyerBalance: buyerBalance.toString(),
      buyerAllowance: buyerAllowance.toString(),
      richestSigner: richest,
    };
    if (buyerBalance < DEFAULT_USDC_MINIMUM && richest && richest.balance > DEFAULT_USDC_MINIMUM && richest.address.toLowerCase() !== buyer.address.toLowerCase()) {
      const richestSpec = availableSpecs.find((entry) => entry.label === richest.label)!;
      const richestWallet = new Wallet(richestSpec.privateKey!, provider);
      const transferReceipt = await (await erc20.connect(richestWallet).transfer(buyer.address, DEFAULT_USDC_MINIMUM - buyerBalance)).wait();
      usdcFunding.transferTxHash = transferReceipt?.hash ?? null;
      usdcFunding.buyerBalanceAfterTransfer = (await erc20.balanceOf(buyer.address)).toString();
    }
    const refreshedBuyerBalance = BigInt(await erc20.balanceOf(buyer.address));
    if (refreshedBuyerBalance > 0n && BigInt(await erc20.allowance(buyer.address, config.diamondAddress)) < refreshedBuyerBalance) {
      const approve = await apiCall(port, "POST", "/v1/tokenomics/commands/token-approve", {
        apiKey: "buyer-key",
        body: { spender: config.diamondAddress, amount: refreshedBuyerBalance.toString() },
      });
      usdcFunding.approval = approve;
      if (approve.status === 202) {
        await waitForReceipt(port, extractTxHash(approve.payload));
      }
      usdcFunding.buyerAllowanceAfterApproval = (await erc20.allowance(buyer.address, config.diamondAddress)).toString();
    }
    status.marketplace = {
      ...(status.marketplace as Record<string, unknown>),
      usdcFunding,
    };
  }

    const sellerVoiceHashes = await voiceAsset.getVoiceAssetsByOwner(seller.address);
    const latestBlock = await provider.getBlock("latest");
  const agedFixture = {
    voiceHash: null as string | null,
    tokenId: null as string | null,
    activeListing: false,
    purchaseReadiness: "unverified" as "unverified" | "listed-not-yet-purchase-proven",
    status: "blocked" as FixtureStatus,
    reason: "missing aged seller asset",
  };
    for (const voiceHash of sellerVoiceHashes as string[]) {
    const asset = await voiceAsset.getVoiceAsset(voiceHash);
    if (BigInt(asset.createdAt) + ONE_DAY > BigInt(latestBlock!.timestamp)) {
      continue;
    }
    const tokenId = await voiceAsset.getTokenId(voiceHash);
    agedFixture.voiceHash = voiceHash;
    agedFixture.tokenId = tokenId.toString();
    const approvalRead = await apiCall(
      port,
      "GET",
      `/v1/voice-assets/queries/is-approved-for-all?owner=${encodeURIComponent(seller.address)}&operator=${encodeURIComponent(config.diamondAddress)}`,
      { apiKey: "read-key" },
    );
    if (approvalRead.payload !== true) {
      const approval = await apiCall(port, "PATCH", "/v1/voice-assets/commands/set-approval-for-all", {
        apiKey: "seller-key",
        body: { operator: config.diamondAddress, approved: true },
      });
      agedFixture.approval = approval;
      if (approval.status === 202) {
        await waitForReceipt(port, extractTxHash(approval.payload));
      }
    }
    const listingRead = await apiCall(
      port,
      "GET",
      `/v1/marketplace/queries/get-listing?tokenId=${encodeURIComponent(tokenId.toString())}`,
      { apiKey: "read-key" },
    );
    if (listingRead.status !== 200 || !(listingRead.payload as Record<string, unknown>)?.isActive) {
      const listing = await apiCall(port, "POST", "/v1/marketplace/commands/list-asset", {
        apiKey: "seller-key",
        body: { tokenId: tokenId.toString(), price: "1000", duration: "0" },
      });
      agedFixture.listing = listing;
      if (listing.status === 202) {
        await waitForReceipt(port, extractTxHash(listing.payload));
      }
    }
    const refreshedListing = await apiCall(
      port,
      "GET",
      `/v1/marketplace/queries/get-listing?tokenId=${encodeURIComponent(tokenId.toString())}`,
      { apiKey: "read-key" },
    );
    agedFixture.activeListing = refreshedListing.status === 200 && (refreshedListing.payload as Record<string, unknown>)?.isActive === true;
    agedFixture.purchaseReadiness = agedFixture.activeListing ? "listed-not-yet-purchase-proven" : "unverified";
    agedFixture.status = agedFixture.activeListing ? "partial" : "partial";
    agedFixture.reason = agedFixture.activeListing
      ? "listing is present; purchaseability still requires live verification and must not be inferred from listing state alone"
      : "listing could not be activated";
    break;
  }
    status.marketplace = {
    ...(status.marketplace as Record<string, unknown>),
    agedListingFixture: agedFixture,
  };

    const proposerRole = roleId("PROPOSER_ROLE");
    const votingConfig = await governorFacet.getVotingConfig();
    const threshold = BigInt(votingConfig[2]);
    const governanceStatus: Record<string, unknown> = {
    proposerAddress: founder.address,
    proposerRolePresent: await accessControl.hasRole(proposerRole, founder.address),
    threshold: threshold.toString(),
      currentVotes: (await delegationFacet.getCurrentVotes(founder.address)).toString(),
    tokenBalance: (await tokenSupply.tokenBalanceOf(founder.address)).toString(),
    mintingFinished: await tokenSupply.supplyIsMintingFinished(),
    bootstrapRepairAttempted: false,
  };
    governanceStatus.currentVotesAfterSetup = (await delegationFacet.getCurrentVotes(founder.address)).toString();
    governanceStatus.status = BigInt(governanceStatus.currentVotesAfterSetup as string) >= threshold &&
      governanceStatus.proposerRolePresent === true ? "ready" : "partial";
    governanceStatus.reason = governanceStatus.status === "ready"
      ? "promoted baseline already provides proposer role access and founder voting power"
      : "promoted baseline is expected to be ready without API-side bootstrap repair; inspect live role or voting power state";
    status.governance = governanceStatus;

    status.licensing = {
    lifecycle: {

      activeLicenseLifecycle: "issueLicense/createLicense -> getLicenseTerms/transferLicense as licensee-scoped operations",
    },
    recommendedActors: {
      licensor: seller.address,
      licensee: licensee?.address ?? null,
      transferee: transferee?.address ?? null,
    },
  };

    await mkdir(RUNTIME_DIR, { recursive: true });
    await writeFile(OUTPUT_PATH, `${JSON.stringify(toJsonValue(status), null, 2)}\n`, "utf8");
    console.log(JSON.stringify(toJsonValue(status), null, 2));
  } finally {
    server.close();
    await provider.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
