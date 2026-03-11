import express, { type Request, type Response } from "express";

import { mountDomainModules } from "./modules/index.js";
import { toHttpError } from "./shared/errors.js";
import { createApiExecutionContext, getTransactionRequest, getTransactionStatus } from "./shared/execution-context.js";
import { createWorkflowRouter } from "./workflows/index.js";

export type ApiServerOptions = {
  port?: number;
};

export type ApiServer = {
  app: express.Express;
  listen: () => ReturnType<express.Express["listen"]>;
};

export function createApiServer(options: ApiServerOptions = {}): ApiServer {
  const apiExecutionContext = createApiExecutionContext();
  const app = express();
  app.set("apiExecutionContext", apiExecutionContext);
  app.use(express.json({ limit: "1mb" }));

  app.get("/v1/system/health", (_request: Request, response: Response) => {
    response.json({
      ok: true,
      chainId: Number(process.env.API_LAYER_CHAIN_ID ?? process.env.CHAIN_ID ?? 84532),
    });
  });

  app.get("/v1/system/provider-status", (_request: Request, response: Response) => {
    response.json(apiExecutionContext.providerRouter.getStatus());
  });

  app.get("/v1/transactions/requests/:requestId", async (request: Request, response: Response) => {
    try {
      response.json(await getTransactionRequest(apiExecutionContext, String(request.params.requestId)));
    } catch (error) {
      const httpError = toHttpError(error);
      response.status(httpError.statusCode).json({
        error: httpError.message,
        ...(httpError.diagnostics === undefined ? {} : { diagnostics: httpError.diagnostics }),
      });
    }
  });

  app.get("/v1/transactions/:txHash", async (request: Request, response: Response) => {
    try {
      response.json(await getTransactionStatus(apiExecutionContext, String(request.params.txHash)));
    } catch (error) {
      const httpError = toHttpError(error);
      response.status(httpError.statusCode).json({
        error: httpError.message,
        ...(httpError.diagnostics === undefined ? {} : { diagnostics: httpError.diagnostics }),
      });
    }
  });

  mountDomainModules(app, apiExecutionContext);
  app.use(createWorkflowRouter(apiExecutionContext));

  return {
    app,
    listen() {
      const port = options.port ?? Number(process.env.API_LAYER_PORT ?? 8787);
      return app.listen(port, () => {
        console.log(`USpeaks API listening on ${port}`);
      });
    },
  };
}
