import path from "node:path";

import { describe, expect, it } from "vitest";

import { generatedManifestDir, readJson } from "./utils.js";

describe("generated HTTP endpoint registry", () => {
  it("matches the full reviewed surface counts", async () => {
    const registry = await readJson<{
      methods: Record<string, unknown>;
      events: Record<string, unknown>;
    }>(path.join(generatedManifestDir, "http-endpoint-registry.json"));

    expect(Object.keys(registry.methods)).toHaveLength(430);
    expect(Object.keys(registry.events)).toHaveLength(184);
  });

  it("contains the curated voice-assets exemplar routes", async () => {
    const registry = await readJson<{
      methods: Record<string, { path: string; httpMethod: string }>;
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
