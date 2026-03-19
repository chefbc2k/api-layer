import path from "node:path";

import { describe, expect, it } from "vitest";

import { generatedManifestDir, readJson } from "./utils.js";
import type { ReviewedApiSurfaceFile } from "./api-surface-lib.js";

describe("generated HTTP endpoint registry", () => {
  it("matches the full reviewed surface counts", async () => {
    const [registry, reviewed] = await Promise.all([
      readJson<{
        methods: Record<string, unknown>;
        events: Record<string, unknown>;
      }>(path.join(generatedManifestDir, "http-endpoint-registry.json")),
      readJson<ReviewedApiSurfaceFile>(path.resolve("reviewed", "reviewed-api-surface.json")),
    ]);

    expect(Object.keys(registry.methods)).toHaveLength(Object.keys(reviewed.methods).length);
    expect(Object.keys(registry.events)).toHaveLength(Object.keys(reviewed.events).length);
  });

  it("stays aligned with the generated reviewed surface keys", async () => {
    const [registry, reviewed] = await Promise.all([
      readJson<{
        methods: Record<string, unknown>;
        events: Record<string, unknown>;
      }>(path.join(generatedManifestDir, "http-endpoint-registry.json")),
      readJson<ReviewedApiSurfaceFile>(path.resolve("reviewed", "reviewed-api-surface.json")),
    ]);

    expect(new Set(Object.keys(registry.methods))).toEqual(new Set(Object.keys(reviewed.methods)));
    expect(new Set(Object.keys(registry.events))).toEqual(new Set(Object.keys(reviewed.events)));
  });

  it("contains the curated voice-assets exemplar routes", async () => {
    const registry = await readJson<{
      methods: Record<string, unknown>;
      events: Record<string, unknown>;
    }>(path.join(generatedManifestDir, "http-endpoint-registry.json"));

    expect(registry.methods["VoiceAssetFacet.registerVoiceAsset"]).toMatchObject({
      httpMethod: "POST",
      path: "/v1/voice-assets",
    });
    expect(registry.methods["VoiceAssetFacet.getVoiceAsset"]).toMatchObject({
      httpMethod: "GET",
      path: "/v1/voice-assets/:voiceHash",
    });
    expect(registry.methods["VoiceMetadataFacet.searchVoicesByClassification"]).toMatchObject({
      httpMethod: "POST",
      path: "/v1/voice-assets/queries/by-classification",
    });
  });
});
