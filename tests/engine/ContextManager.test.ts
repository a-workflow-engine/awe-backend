import { contextManager } from "../../src/engine/ContextManager.js";
import { ContextVariableScopeType } from "../../src/types/enums.js";

describe("ContextManager", () => {
  describe("create()", () => {
    it("returns empty global and next scopes", () => {
      const ctx = contextManager.create();
      expect(ctx.global).toEqual({});
      expect(ctx.next).toEqual({});
    });
  });

  describe("merge()", () => {
    it("merges into GLOBAL scope and leaves next untouched", () => {
      const ctx = contextManager.create();
      const merged = contextManager.merge(ctx, { x: 1 }, ContextVariableScopeType.GLOBAL);
      expect(merged.global).toEqual({ x: 1 });
      expect(merged.next).toEqual({});
    });

    it("merges into NEXT scope and leaves global untouched", () => {
      const ctx = contextManager.create();
      const merged = contextManager.merge(ctx, { y: 2 }, ContextVariableScopeType.NEXT);
      expect(merged.next).toEqual({ y: 2 });
      expect(merged.global).toEqual({});
    });

    it("does not mutate the original context object", () => {
      const ctx = { global: { a: 1 }, next: { b: 2 } };
      const globalBefore = { ...ctx.global };
      const nextBefore = { ...ctx.next };
      contextManager.merge(ctx, { x: 99 }, ContextVariableScopeType.GLOBAL);
      expect(ctx.global).toEqual(globalBefore);
      expect(ctx.next).toEqual(nextBefore);
    });
  });

  describe("resolveForNode()", () => {
    it("flattens global and next into one object", () => {
      const ctx = { global: { a: 1 }, next: { b: 2 } };
      expect(contextManager.resolveForNode(ctx)).toEqual({ a: 1, b: 2 });
    });

    it("next scope values shadow global scope values for the same key", () => {
      const ctx = { global: { k: "global-value" }, next: { k: "next-value" } };
      expect(contextManager.resolveForNode(ctx)).toEqual({ k: "next-value" });
    });
  });

  describe("clearNextScope()", () => {
    it("empties next and preserves global", () => {
      const ctx = { global: { a: 1 }, next: { b: 2 } };
      const cleared = contextManager.clearNextScope(ctx);
      expect(cleared.next).toEqual({});
      expect(cleared.global).toEqual({ a: 1 });
    });

    it("does not mutate the original context", () => {
      const ctx = { global: { a: 1 }, next: { b: 2 } };
      contextManager.clearNextScope(ctx);
      expect(ctx.next).toEqual({ b: 2 });
    });
  });

  describe("fromJson()", () => {
    it("returns correct WorkflowContext from well-formed JSON", () => {
      const json = { global: { x: 1 }, next: { y: 2 } };
      const result = contextManager.fromJson(json);
      expect(result.global).toEqual({ x: 1 });
      expect(result.next).toEqual({ y: 2 });
    });

    it("returns empty scopes when input is null", () => {
      const result = contextManager.fromJson(null);
      expect(result).toEqual({ global: {}, next: {} });
    });

    it("defaults global to empty object when key is missing", () => {
      const json = { next: { y: 2 } };
      const result = contextManager.fromJson(json);
      expect(result.global).toEqual({});
      expect(result.next).toEqual({ y: 2 });
    });
  });
});
