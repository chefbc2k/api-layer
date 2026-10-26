import { getAddress, ZeroAddress } from "ethers";
import type { Request } from "express";
import type { AuthContext } from "../shared/auth.js";
import { HttpError } from "../shared/errors.js";
import { decimalUnits } from "./config.js";
import type { CoinbaseQuote } from "./provider.js";

export function fundingActor(auth: AuthContext, request: Request): { userId: string; wallet: string } {
  if (!auth.fundingUserId || !auth.walletAddress) throw new HttpError(403, "Funding requires an explicitly bound customer identity and wallet");
  let wallet: string;
  try { wallet = getAddress(auth.walletAddress); } catch { throw new HttpError(403, "Funding wallet binding is invalid"); }
  if (wallet === ZeroAddress) throw new HttpError(403, "Funding wallet binding is invalid");
  const suppliedWallet = request.header("x-wallet-address");
  if (suppliedWallet && suppliedWallet.toLowerCase() !== wallet.toLowerCase()) throw new HttpError(403, "Funding wallet does not match authenticated customer");
  return { userId: auth.fundingUserId, wallet };
}

export function validateQuote(quote: CoinbaseQuote, wallet: string, amountKind: "payment" | "purchase", amount: string): void {
  try {
    if (getAddress(quote.destinationAddress) !== getAddress(wallet)) throw new Error("recipient mismatch");
    const total = decimalUnits(quote.paymentTotal, 6);
    const subtotal = decimalUnits(quote.paymentSubtotal, 6);
    const purchase = decimalUnits(quote.purchaseAmount, 6);
    const fees = quote.fees.reduce((sum, fee) => sum + decimalUnits(fee.amount, 6), 0n);
    if (total <= 0n || subtotal <= 0n || purchase <= 0n || total !== subtotal + fees) throw new Error("inconsistent pricing");
    if ((amountKind === "payment" ? total : purchase) !== decimalUnits(amount, 6)) throw new Error("amount mismatch");
  } catch { throw new HttpError(502, "Coinbase returned inconsistent quote pricing or destination"); }
}

