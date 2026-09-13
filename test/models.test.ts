import assert from "node:assert/strict";
import test from "node:test";
import type { CursorModelDef } from "../src/models.ts";
import { toCursorId, toProviderModels } from "../src/models.ts";

function model(id: string, name: string): CursorModelDef {
    return {
        id,
        name,
        reasoning: false,
        contextWindow: 200_000,
        maxTokens: 32_768,
    };
}

test("automatically combines unknown reasoning variants", () => {
    const models = toProviderModels([
        model("new-model-low", "New Model Low"),
        model("new-model-medium", "New Model"),
        model("new-model-high", "New Model High"),
        model("new-model-extra-high", "New Model Extra High"),
        model("new-model-low-fast", "New Model Low Fast"),
        model("new-model-high-fast", "New Model Fast"),
    ]);

    assert.deepEqual(
        models.map(({ id }) => id),
        ["new-model", "new-model-fast"],
    );
    assert.equal(models[0].reasoning, true);
    assert.deepEqual(models[0].thinkingLevelMap, {
        minimal: "minimal",
        low: "low",
        medium: "medium",
        high: "high",
        xhigh: "xhigh",
        max: null,
    });
    assert.equal(toCursorId("new-model"), "new-model-medium");
    assert.equal(toCursorId("new-model", "minimal"), "new-model-low");
    assert.equal(toCursorId("new-model", "xhigh"), "new-model-extra-high");
    assert.equal(toCursorId("new-model-fast"), "new-model-high-fast");
    assert.equal(toCursorId("new-model-fast", "low"), "new-model-low-fast");
});

test("prefers explicit thinking variants over non-thinking effort variants", () => {
    const models = toProviderModels([
        model("future-claude-high", "Future Claude"),
        model("future-claude-thinking-low", "Future Claude Low Thinking"),
        model("future-claude-thinking-high", "Future Claude High Thinking"),
    ]);

    assert.deepEqual(
        models.map(({ id }) => id),
        ["future-claude"],
    );
    assert.equal(toCursorId("future-claude"), "future-claude-high");
    assert.equal(toCursorId("future-claude", "low"), "future-claude-thinking-low");
    assert.equal(toCursorId("future-claude", "high"), "future-claude-thinking-high");
});

test("maps a level-less thinking variant to every reasoning level", () => {
    const models = toProviderModels([
        model("future-sonnet", "Future Sonnet"),
        model("future-sonnet-thinking", "Future Sonnet Thinking"),
    ]);

    assert.deepEqual(
        models.map(({ id }) => id),
        ["future-sonnet"],
    );
    assert.equal(toCursorId("future-sonnet"), "future-sonnet");
    assert.equal(toCursorId("future-sonnet", "minimal"), "future-sonnet-thinking");
    assert.equal(toCursorId("future-sonnet", "max"), "future-sonnet-thinking");
});

test("maps a single level-thinking pair as a general thinking toggle", () => {
    const models = toProviderModels([
        model("future-opus-medium", "Future Opus"),
        model("future-opus-medium-thinking", "Future Opus Thinking"),
    ]);

    assert.deepEqual(
        models.map(({ id }) => id),
        ["future-opus"],
    );
    assert.equal(toCursorId("future-opus"), "future-opus-medium");
    assert.equal(toCursorId("future-opus", "low"), "future-opus-medium-thinking");
    assert.equal(toCursorId("future-opus", "xhigh"), "future-opus-medium-thinking");
});

test("replaces stale discovered routing when models are refreshed", () => {
    toProviderModels([model("new-model", "New Model")]);

    assert.equal(toCursorId("new-model", "high"), "new-model");
});

test("does not expose stale hardcoded levels for a discovered model", () => {
    const models = toProviderModels([model("claude-4.5-sonnet", "Sonnet 4.5")]);

    assert.equal(models[0].reasoning, false);
    assert.equal(models[0].thinkingLevelMap, undefined);
    assert.equal(toCursorId("claude-sonnet-4-5", "high"), "claude-4.5-sonnet");
});
