import { CdpClient } from "@coinbase/cdp-sdk";

type CdpClientLike = {
  evm?: {
    getAccount?: (args: Record<string, unknown>) => Promise<any>;
    getSmartAccount?: (args: Record<string, unknown>) => Promise<any>;
    getOrCreateSmartAccount?: (args: Record<string, unknown>) => Promise<any>;
    sendUserOperation?: (args: Record<string, unknown>) => Promise<any>;
  };
};

function envFirst(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

function loadClient(): CdpClientLike {
  const apiKeyId = envFirst("CDP_API_KEY_ID", "CDP_API_KEY_NAME");
  const apiKeySecret = envFirst("CDP_API_KEY_SECRET");
  const walletSecret = envFirst("CDP_WALLET_SECRET");

  if (!apiKeyId || !apiKeySecret || !walletSecret) {
    throw new Error("CDP_API_KEY_ID/CDP_API_KEY_SECRET/CDP_WALLET_SECRET are required for cdpSmartWallet");
  }

  const client = new CdpClient({
    apiKeyId,
    apiKeySecret,
    walletSecret,
  }) as unknown as CdpClientLike;

  if (!client.evm?.getAccount || !client.evm?.getSmartAccount || !client.evm?.getOrCreateSmartAccount || !client.evm?.sendUserOperation) {
    throw new Error("installed @coinbase/cdp-sdk does not expose expected evm methods");
  }

  return client;
}

function getAccountAddress(account: any): string | undefined {
  return account?.address || account?.account?.address || account?.smartAccount?.address || undefined;
}

async function resolveSmartAccount(client: CdpClientLike): Promise<any> {
  const expectedAddress = process.env.COINBASE_SMART_WALLET_ADDRESS?.toLowerCase();
  const ownerName = process.env.COINBASE_SMART_WALLET_OWNER_NAME;
  const ownerAddress = process.env.COINBASE_SMART_WALLET_OWNER_ADDRESS;
  const accountName = process.env.COINBASE_SMART_WALLET_ACCOUNT_NAME || "api-layer-governance-wallet";

  if (expectedAddress) {
    const account = await client.evm!.getSmartAccount!({ address: expectedAddress });
    const actual = getAccountAddress(account)?.toLowerCase();
    if (!actual) {
      throw new Error("CDP returned a smart account without an address");
    }
    if (actual !== expectedAddress) {
      throw new Error(`configured COINBASE_SMART_WALLET_ADDRESS ${expectedAddress} does not match ${actual}`);
    }
    return account;
  }

  const owner = ownerAddress
    ? await client.evm!.getAccount!({ address: ownerAddress })
    : ownerName
      ? await client.evm!.getAccount!({ name: ownerName })
      : null;

  if (!owner) {
    throw new Error("Provide COINBASE_SMART_WALLET_ADDRESS or COINBASE_SMART_WALLET_OWNER_NAME/COINBASE_SMART_WALLET_OWNER_ADDRESS");
  }

  return client.evm!.getOrCreateSmartAccount!({
    name: accountName,
    owner,
  });
}

export async function submitSmartWalletCall(call: { to: string; data: string; value?: string }): Promise<{
  relay: "cdp-smart-wallet";
  network: string;
  smartWalletAddress: string;
  userOperationHash: string;
  receipt: unknown;
}> {
  const client = loadClient();
  const smartAccount = await resolveSmartAccount(client);
  const smartWalletAddress = getAccountAddress(smartAccount);
  if (!smartWalletAddress) {
    throw new Error("unable to resolve smart wallet address");
  }
  const network = process.env.COINBASE_SMART_WALLET_NETWORK || "base-sepolia";
  const paymasterUrl = process.env.COINBASE_PAYMASTER_URL;
  const response = await client.evm!.sendUserOperation!({
    smartAccount,
    network,
    calls: [
      {
        to: call.to,
        data: call.data,
        value: call.value ?? "0x0",
      },
    ],
    ...(paymasterUrl ? { paymasterUrl } : {}),
  });

  const userOperationHash = String(
    response?.userOperationHash ??
      response?.userOpHash ??
      response?.id ??
      response?.operationId ??
      "",
  );
  if (!userOperationHash) {
    throw new Error("CDP did not return a user operation hash");
  }

  const receipt = typeof response?.wait === "function" ? await response.wait() : response;
  return {
    relay: "cdp-smart-wallet",
    network,
    smartWalletAddress,
    userOperationHash,
    receipt,
  };
}
