import { edgeResolver } from "../../src/engine/EdgeResolver.js";
import { NodeTypes } from "../../src/types/enums.js";
import type { NodeModel, EdgeModel } from "../../src/types/models.js";
import { StateTransitionError } from "../../src/errors/StateTransitionError.js";

const baseNode = {
  client_id: "client-n",
  workflow_version_id: "wfv-1",
  configuration: {},
  max_attempts: 1,
  name: null,
  description: null,
  input_schema: null,
  output_schema: null,
  x_coordinate: null,
  y_coordinate: null,
  is_deleted: false,
  created_by: "actor-1",
  modified_by: "actor-1",
  created_on: new Date(),
  modified_on: new Date(),
  deleted_by: null,
  deleted_on: null,
};

const makeNode = (id: string, type: NodeModel["type"]): NodeModel => ({
  ...baseNode,
  id,
  client_id: `client-${id}`,
  type,
});

const baseEdge = {
  client_id: "client-e",
  name: null,
  is_deleted: false,
  created_by: "actor-1",
  modified_by: "actor-1",
  created_on: new Date(),
  modified_on: new Date(),
  deleted_by: null,
  deleted_on: null,
};

const makeEdge = (
  id: string,
  source: string,
  dest: string | null,
  cond: string | null = null,
): EdgeModel => ({
  ...baseEdge,
  id,
  client_id: `client-${id}`,
  source_node_id: source,
  destination_node_id: dest,
  condition_expression: cond,
});

const emptyContext = { global: {}, next: {} };

describe("EdgeResolver", () => {
  describe("non-decision nodes", () => {
    it("returns the destination id for a single outgoing edge", () => {
      const nodes = [makeNode("n1", NodeTypes.START), makeNode("n2", NodeTypes.END)];
      const edges = [makeEdge("e1", "n1", "n2")];
      expect(edgeResolver.resolveNextNodeIds("n1", emptyContext, edges, nodes)).toEqual(["n2"]);
    });

    it("returns all destination ids for multiple outgoing edges", () => {
      const nodes = [
        makeNode("n1", NodeTypes.START),
        makeNode("n2", NodeTypes.END),
        makeNode("n3", NodeTypes.END),
      ];
      const edges = [makeEdge("e1", "n1", "n2"), makeEdge("e2", "n1", "n3")];
      const result = edgeResolver.resolveNextNodeIds("n1", emptyContext, edges, nodes);
      expect(result).toEqual(expect.arrayContaining(["n2", "n3"]));
      expect(result).toHaveLength(2);
    });

    it("returns empty array when there are no outgoing edges", () => {
      const nodes = [makeNode("n1", NodeTypes.END)];
      expect(edgeResolver.resolveNextNodeIds("n1", emptyContext, [], nodes)).toEqual([]);
    });

    it("excludes edges with null destination_node_id", () => {
      const nodes = [makeNode("n1", NodeTypes.START)];
      const edges = [makeEdge("e1", "n1", null)];
      expect(edgeResolver.resolveNextNodeIds("n1", emptyContext, edges, nodes)).toEqual([]);
    });

    it("treats completedNodeId not found in nodes as a non-decision node", () => {
      const nodes = [makeNode("n2", NodeTypes.END)];
      const edges = [makeEdge("e1", "unknown-id", "n2")];
      expect(edgeResolver.resolveNextNodeIds("unknown-id", emptyContext, edges, nodes)).toEqual(["n2"]);
    });
  });

  describe("decision nodes", () => {
    it("returns destination of matching conditional edge", () => {
      const ctx = { global: { amount: 500 }, next: {} };
      const nodes = [makeNode("d1", NodeTypes.DECISION), makeNode("n2", NodeTypes.END)];
      const edges = [makeEdge("e1", "d1", "n2", "amount > 100")];
      expect(edgeResolver.resolveNextNodeIds("d1", ctx, edges, nodes)).toEqual(["n2"]);
    });

    it("falls back to default edge when no condition matches", () => {
      const ctx = { global: { amount: 10 }, next: {} };
      const nodes = [
        makeNode("d1", NodeTypes.DECISION),
        makeNode("n2", NodeTypes.END),
        makeNode("n3", NodeTypes.END),
      ];
      const edges = [
        makeEdge("e1", "d1", "n2", "amount > 100"),
        makeEdge("e2", "d1", "n3", null),
      ];
      expect(edgeResolver.resolveNextNodeIds("d1", ctx, edges, nodes)).toEqual(["n3"]);
    });

    it("throws StateTransitionError when no condition matches and no default edge", () => {
      const ctx = { global: { amount: 10 }, next: {} };
      const nodes = [makeNode("d1", NodeTypes.DECISION), makeNode("n2", NodeTypes.END)];
      const edges = [makeEdge("e1", "d1", "n2", "amount > 100")];
      expect(() =>
        edgeResolver.resolveNextNodeIds("d1", ctx, edges, nodes),
      ).toThrow(StateTransitionError);
    });

    it("returns all destinations when multiple conditions match", () => {
      const ctx = { global: { amount: 500 }, next: {} };
      const nodes = [
        makeNode("d1", NodeTypes.DECISION),
        makeNode("n2", NodeTypes.END),
        makeNode("n3", NodeTypes.END),
      ];
      const edges = [
        makeEdge("e1", "d1", "n2", "amount > 100"),
        makeEdge("e2", "d1", "n3", "amount > 200"),
      ];
      const result = edgeResolver.resolveNextNodeIds("d1", ctx, edges, nodes);
      expect(result).toEqual(expect.arrayContaining(["n2", "n3"]));
      expect(result).toHaveLength(2);
    });
  });
});
