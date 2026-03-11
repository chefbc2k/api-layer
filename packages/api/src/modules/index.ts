import type express from "express";

import { createAccessControlPrimitiveRouter } from "./access-control/index.js";
import { createDatasetsPrimitiveRouter } from "./datasets/index.js";
import { createDiamondAdminPrimitiveRouter } from "./diamond-admin/index.js";
import { createEmergencyPrimitiveRouter } from "./emergency/index.js";
import { createGovernancePrimitiveRouter } from "./governance/index.js";
import { createLicensingPrimitiveRouter } from "./licensing/index.js";
import { createMarketplacePrimitiveRouter } from "./marketplace/index.js";
import { createMultisigPrimitiveRouter } from "./multisig/index.js";
import { createOwnershipPrimitiveRouter } from "./ownership/index.js";
import { createStakingPrimitiveRouter } from "./staking/index.js";
import { createTokenomicsPrimitiveRouter } from "./tokenomics/index.js";
import { createVoiceAssetsPrimitiveRouter } from "./voice-assets/index.js";
import { createWhisperblockPrimitiveRouter } from "./whisperblock/index.js";

import type { ApiExecutionContext } from "../shared/execution-context.js";

export function mountDomainModules(app: express.Express, context: ApiExecutionContext): void {
  app.use(createAccessControlPrimitiveRouter(context));
  app.use(createDatasetsPrimitiveRouter(context));
  app.use(createDiamondAdminPrimitiveRouter(context));
  app.use(createEmergencyPrimitiveRouter(context));
  app.use(createGovernancePrimitiveRouter(context));
  app.use(createLicensingPrimitiveRouter(context));
  app.use(createMarketplacePrimitiveRouter(context));
  app.use(createMultisigPrimitiveRouter(context));
  app.use(createOwnershipPrimitiveRouter(context));
  app.use(createStakingPrimitiveRouter(context));
  app.use(createTokenomicsPrimitiveRouter(context));
  app.use(createVoiceAssetsPrimitiveRouter(context));
  app.use(createWhisperblockPrimitiveRouter(context));
}
