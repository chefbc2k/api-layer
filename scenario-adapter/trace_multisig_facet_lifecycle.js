#!/usr/bin/env node
"use strict";

const { ethers } = require("ethers");
require("dotenv").config();
const {
  ROLE,
  loadArtifact,
  createProvider,
  sendAndWait,
  expectRevert,
  advanceTime,
  randomWallet,
  fundEth
} = require("./lib/access_helpers");

const RPC_URL = process.env.RPC_URL;
const DIAMOND_ADDRESS = process.env.DIAMOND_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

function id(text) {
  return ethers.keccak256(ethers.toUtf8Bytes(text));
}

async function main() {
  if (!DIAMOND_ADDRESS) throw new Error("DIAMOND_ADDRESS is required");
  if (!PRIVATE_KEY) throw new Error("PRIVATE_KEY is required");

  const provider = createProvider(RPC_URL);
  const founder = new ethers.NonceManager(new ethers.Wallet(PRIVATE_KEY, provider));
  const founderAddress = await founder.getAddress();
  const operator1 = randomWallet(provider);
  const operator2 = randomWallet(provider);
  const outsider = randomWallet(provider);
  const newOperator = randomWallet(provider);

  await fundEth(founder, [operator1, operator2, outsider, newOperator]);

  const access = new ethers.Contract(
    DIAMOND_ADDRESS,
    loadArtifact("out/AccessControlFacet.sol/AccessControlFacet.json").abi,
    provider
  );
  const multisig = new ethers.Contract(
    DIAMOND_ADDRESS,
    loadArtifact("out/MultiSigFacet.sol/MultiSigFacet.json").abi,
    provider
  );

  const operator1Address = await operator1.getAddress();
  const operator2Address = await operator2.getAddress();
  const outsiderAddress = await outsider.getAddress();
  const newOperatorAddress = await newOperator.getAddress();

  if (!(await access.hasRole(ROLE.FOUNDER_ROLE, founderAddress))) {
    throw new Error("founder should have founder role after access init");
  }

  await sendAndWait(multisig.connect(founder).addOperator(operator1Address), "addOperator:operator1");
  await sendAndWait(multisig.connect(founder).addOperator(operator2Address), "addOperator:operator2");
  if (!(await multisig.isOperator(operator1Address))) throw new Error("operator1 should be active");
  if (!(await multisig.isOperator(operator2Address))) throw new Error("operator2 should be active");

  await expectRevert(
    () => multisig.connect(outsider).proposeOperation([multisig.interface.encodeFunctionData("muSetPaused", [true])], 2),
    "proposeOperation:outsider"
  );

  const pauseAction = multisig.interface.encodeFunctionData("muSetPaused", [true]);
  const proposePauseTx = await multisig.connect(founder).proposeOperation([pauseAction], 2);
  const proposePauseRc = await sendAndWait(Promise.resolve(proposePauseTx), "proposeOperation:pause");
  const proposedLog = proposePauseRc.logs
    .map((log) => { try { return multisig.interface.parseLog(log); } catch { return null; } })
    .find((log) => log && log.name === "OperationProposed");
  if (!proposedLog) throw new Error("pause operation event missing");
  const pauseOperationId = proposedLog.args.id;

  let [canExecuteBefore, reasonBefore] = await multisig.canExecuteOperation(pauseOperationId);
  if (canExecuteBefore || reasonBefore !== "Insufficient approvals") {
    throw new Error("pause operation should require more approvals before execution");
  }

  await sendAndWait(multisig.connect(founder).approveOperation(pauseOperationId), "approveOperation:pause:founder");
  await sendAndWait(multisig.connect(operator1).approveOperation(pauseOperationId), "approveOperation:pause:operator1");
  let [canExecuteAfter] = await multisig.canExecuteOperation(pauseOperationId);
  if (!canExecuteAfter) throw new Error("pause operation should be executable after approvals");

  await sendAndWait(multisig.connect(founder).executeOperation(pauseOperationId), "executeOperation:pause");
  await expectRevert(
    () => multisig.connect(operator1).submitTransaction(founderAddress, 0, "0x"),
    "submitTransaction:paused"
  );
  await expectRevert(
    () => multisig.connect(operator1).proposeOperation([multisig.interface.encodeFunctionData("muSetPaused", [false])], 2),
    "proposeOperation:unpause:paused"
  );

  await sendAndWait(multisig.connect(founder).muSetPaused(false), "muSetPaused:false:admin");

  await advanceTime(provider, 2);

  const addNewOperatorAction = multisig.interface.encodeFunctionData("addOperator", [newOperatorAddress]);
  const opTx = await multisig.connect(founder).proposeOperation([addNewOperatorAction], 2);
  const opRc = await sendAndWait(Promise.resolve(opTx), "proposeOperation:addOperator");
  const addOperatorLog = opRc.logs
    .map((log) => { try { return multisig.interface.parseLog(log); } catch { return null; } })
    .find((log) => log && log.name === "OperationProposed");
  const addOperatorOperationId = addOperatorLog.args.id;
  await sendAndWait(multisig.connect(founder).approveOperation(addOperatorOperationId), "approveOperation:addOperator:founder");
  await sendAndWait(multisig.connect(operator2).approveOperation(addOperatorOperationId), "approveOperation:addOperator:operator2");
  await sendAndWait(multisig.connect(founder).executeOperation(addOperatorOperationId), "executeOperation:addOperator");
  if (!(await multisig.isOperator(newOperatorAddress))) throw new Error("new operator should be added via multisig op");

  await advanceTime(provider, 2);

  const removeOperatorAction = multisig.interface.encodeFunctionData("removeOperator", [newOperatorAddress]);
  const cancelTx = await multisig.connect(founder).proposeOperation([removeOperatorAction], 2);
  const cancelRc = await sendAndWait(Promise.resolve(cancelTx), "proposeOperation:removeOperator");
  const cancelLog = cancelRc.logs
    .map((log) => { try { return multisig.interface.parseLog(log); } catch { return null; } })
    .find((log) => log && log.name === "OperationProposed");
  const cancelOperationId = cancelLog.args.id;
  await sendAndWait(
    multisig.connect(founder).cancelOperation(cancelOperationId, "no longer needed"),
    "cancelOperation:removeOperator"
  );
  const cancelledStatus = await multisig.getOperationStatus(cancelOperationId);
  if (cancelledStatus !== 4n) throw new Error("cancelled operation should report Cancelled status");

  await advanceTime(provider, 2);

  const submitTxRc = await sendAndWait(
    multisig.connect(founder).submitTransaction(founderAddress, 0, "0x"),
    "submitTransaction:basic"
  );
  const submitTxLog = submitTxRc.logs
    .map((log) => { try { return multisig.interface.parseLog(log); } catch { return null; } })
    .find((log) => log && log.name === "OperationProposed");
  if (!submitTxLog) throw new Error("submitted transaction should emit OperationProposed");
  const txOperationId = submitTxLog.args.id;
  const [txProposer, txActions, txRequiredApprovals] = await multisig.getOperation(txOperationId);
  if (txProposer.toLowerCase() !== founderAddress.toLowerCase()) throw new Error("submitted transaction proposer mismatch");
  if (txActions.length !== 1) throw new Error("submitted transaction should create one action");
  if (txRequiredApprovals !== 2n) throw new Error("submitted transaction should use default approvals");
  await sendAndWait(multisig.connect(founder).approveOperation(txOperationId), "approveOperation:transaction:founder");
  await sendAndWait(multisig.connect(operator2).approveOperation(txOperationId), "approveOperation:transaction:operator2");
  const [txCanExecute] = await multisig.canExecuteOperation(txOperationId);
  if (!txCanExecute) throw new Error("submitted transaction should become executable after approvals");
  await sendAndWait(multisig.connect(founder).executeOperation(txOperationId), "executeOperation:transaction");
  const txStatus = await multisig.getOperationStatus(txOperationId);
  if (txStatus !== 3n) throw new Error("submitted transaction should report Executed status after execution");

  console.log("TRACE_MULTISIG_FACET_LIFECYCLE: PASS");
}

main().catch((err) => {
  console.error("TRACE_MULTISIG_FACET_LIFECYCLE: FAIL");
  console.error(err);
  process.exit(1);
});
