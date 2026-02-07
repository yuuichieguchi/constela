/**
 * Test suite for pie chart label group transform.
 *
 * Bug: The label <g> element inside the showLabels conditional does NOT have
 * a `transform` prop with `translate(width/2, height/2)`. Without this
 * transform, labels are rendered at the (0,0) SVG origin and fall outside
 * the visible viewBox.
 *
 * The slices <g> already has the correct transform. The label <g> must match.
 *
 * Coverage:
 * - Precondition: label <g> exists inside showLabels conditional
 * - Main: label <g> has transform with translate(width/2, height/2)
 * - Consistency: label <g> transform matches slices <g> transform
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ==================== Types ====================

interface ElementNode {
  kind: "element";
  tag: string;
  props: Record<string, unknown>;
  children?: AnyNode[];
}

interface IfNode {
  kind: "if";
  condition: Record<string, unknown>;
  then: AnyNode;
  else?: AnyNode;
}

interface EachNode {
  kind: "each";
  items: unknown;
  as: string;
  index?: string;
  body: AnyNode;
}

interface TextNode {
  kind: "text";
  value: unknown;
}

type AnyNode =
  | ElementNode
  | IfNode
  | EachNode
  | TextNode
  | Record<string, unknown>;

interface ConcatExpr {
  expr: "concat";
  items: Array<Record<string, unknown>>;
}

// ==================== Helpers ====================

/**
 * Recursively find all element nodes matching a predicate.
 */
function findElements(
  node: unknown,
  predicate: (el: ElementNode) => boolean
): ElementNode[] {
  const results: ElementNode[] = [];

  if (node === null || node === undefined || typeof node !== "object") {
    return results;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      results.push(...findElements(item, predicate));
    }
    return results;
  }

  const obj = node as Record<string, unknown>;

  if (obj.kind === "element" && typeof obj.tag === "string") {
    const el = obj as unknown as ElementNode;
    if (predicate(el)) {
      results.push(el);
    }
  }

  for (const value of Object.values(obj)) {
    if (typeof value === "object" && value !== null) {
      results.push(...findElements(value, predicate));
    }
  }

  return results;
}

/**
 * Recursively find all "if" nodes whose condition references a specific param.
 */
function findIfNodes(node: unknown, paramName: string): IfNode[] {
  const results: IfNode[] = [];

  if (node === null || node === undefined || typeof node !== "object") {
    return results;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      results.push(...findIfNodes(item, paramName));
    }
    return results;
  }

  const obj = node as Record<string, unknown>;

  if (obj.kind === "if") {
    const condition = obj.condition as Record<string, unknown> | undefined;
    if (
      condition &&
      condition.expr === "param" &&
      condition.name === paramName
    ) {
      results.push(obj as unknown as IfNode);
    }
  }

  for (const value of Object.values(obj)) {
    if (typeof value === "object" && value !== null) {
      results.push(...findIfNodes(value, paramName));
    }
  }

  return results;
}

/**
 * Check if a prop value is a concat expression containing literal substrings.
 */
function isConcatWithLiterals(
  prop: unknown,
  ...substrings: string[]
): boolean {
  if (prop === null || prop === undefined || typeof prop !== "object") {
    return false;
  }
  const expr = prop as ConcatExpr;
  if (expr.expr !== "concat" || !Array.isArray(expr.items)) {
    return false;
  }
  for (const substring of substrings) {
    const found = expr.items.some(
      (item) =>
        item.expr === "lit" &&
        typeof item.value === "string" &&
        item.value.includes(substring)
    );
    if (!found) {
      return false;
    }
  }
  return true;
}

// ==================== Test Data ====================

const COMPONENTS_DIR = resolve(__dirname, "..", "components", "chart");

function loadComponentJson(filename: string): Record<string, unknown> {
  const filePath = resolve(COMPONENTS_DIR, filename);
  const content = readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}

// ==================== Tests ====================

describe("Pie chart label <g> transform", () => {
  const json = loadComponentJson("pie-chart.constela.json");

  /**
   * Helper: get the label <g> element from the showLabels conditional.
   */
  function getLabelG(): ElementNode | undefined {
    const ifNodes = findIfNodes(json, "showLabels");
    for (const ifNode of ifNodes) {
      const thenBranch = ifNode.then as Record<string, unknown>;
      if (thenBranch.kind === "element" && thenBranch.tag === "g") {
        return thenBranch as unknown as ElementNode;
      }
    }
    return undefined;
  }

  /**
   * Helper: get the slices <g> element (has filter containing "pieShadow").
   */
  function getSlicesG(): ElementNode | undefined {
    const matches = findElements(
      json,
      (el) =>
        el.tag === "g" &&
        el.props != null &&
        el.props["filter"] !== undefined &&
        typeof el.props["filter"] === "object" &&
        (el.props["filter"] as Record<string, unknown>).expr === "lit" &&
        typeof (el.props["filter"] as Record<string, unknown>).value ===
          "string" &&
        ((el.props["filter"] as Record<string, unknown>).value as string).includes(
          "pieShadow"
        )
    );
    return matches[0];
  }

  // ==================== Precondition ====================

  it("should have a label <g> element inside showLabels conditional", () => {
    const ifNodes = findIfNodes(json, "showLabels");
    expect(
      ifNodes.length,
      'Expected at least one "if" node with condition referencing "showLabels" param'
    ).toBeGreaterThanOrEqual(1);

    const labelG = getLabelG();
    expect(
      labelG,
      'Expected the "then" branch of the showLabels conditional to be a <g> element'
    ).toBeDefined();
    expect(labelG!.kind).toBe("element");
    expect(labelG!.tag).toBe("g");
  });

  // ==================== Main Test ====================

  it("label <g> should have transform with translate(width/2, height/2)", () => {
    const labelG = getLabelG();
    expect(
      labelG,
      "Precondition: label <g> must exist"
    ).toBeDefined();

    // The label <g> must have a transform prop
    expect(
      labelG!.props["transform"],
      "Label <g> must have a transform prop to center labels in the viewBox"
    ).toBeDefined();

    // The transform must be a concat expression
    const transform = labelG!.props["transform"] as Record<string, unknown>;
    expect(
      transform.expr,
      'Label <g> transform must be a concat expression (expr: "concat")'
    ).toBe("concat");

    // The concat must include "translate(" and ")" literals
    expect(
      isConcatWithLiterals(transform, "translate(", ")"),
      'Label <g> transform concat must include literal "translate(" and ")" substrings'
    ).toBe(true);
  });

  // ==================== Consistency Test ====================

  it("label <g> transform should match slices <g> transform", () => {
    const slicesG = getSlicesG();
    expect(
      slicesG,
      "Precondition: slices <g> with pieShadow filter must exist"
    ).toBeDefined();
    expect(
      slicesG!.props["transform"],
      "Slices <g> must have a transform prop"
    ).toBeDefined();

    const labelG = getLabelG();
    expect(
      labelG,
      "Precondition: label <g> must exist"
    ).toBeDefined();
    expect(
      labelG!.props["transform"],
      "Label <g> must have a transform prop to match slices <g>"
    ).toBeDefined();

    // Deep equality: label transform must exactly match slices transform
    expect(labelG!.props["transform"]).toEqual(slicesG!.props["transform"]);
  });
});
