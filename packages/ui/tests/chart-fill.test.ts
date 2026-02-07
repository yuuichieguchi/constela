/**
 * Test suite for chart stroke path fill attribute.
 *
 * Bug: SVG <path> elements used for line/area chart strokes lack a `fill` prop.
 * SVG defaults to fill="black", which causes black triangles to appear.
 * These tests verify that stroke path elements have `fill: "none"` set explicitly.
 *
 * Coverage:
 * - line-chart.constela.json: path with filter "lineGlow" must have fill="none"
 * - area-chart.constela.json: path with filter "areaGlow" must have fill="none"
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
  condition: unknown;
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

type AnyNode = ElementNode | IfNode | EachNode | TextNode | Record<string, unknown>;

interface LitExpr {
  expr: "lit";
  value: string | number;
}

// ==================== Helpers ====================

/**
 * Recursively find all element nodes matching given criteria within the
 * component JSON tree.
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

  // Check if this is an element node matching the predicate
  if (obj.kind === "element" && typeof obj.tag === "string") {
    const el = obj as unknown as ElementNode;
    if (predicate(el)) {
      results.push(el);
    }
  }

  // Recurse into all object values to find nested elements
  for (const value of Object.values(obj)) {
    if (typeof value === "object" && value !== null) {
      results.push(...findElements(value, predicate));
    }
  }

  return results;
}

/**
 * Check if a prop value is a literal expression containing a specific substring.
 */
function propLitContains(prop: unknown, substring: string): boolean {
  if (prop === null || prop === undefined || typeof prop !== "object") {
    return false;
  }
  const expr = prop as LitExpr;
  return (
    expr.expr === "lit" &&
    typeof expr.value === "string" &&
    expr.value.includes(substring)
  );
}

/**
 * Check if a prop value is a literal expression equal to a specific value.
 */
function propLitEquals(prop: unknown, value: string): boolean {
  if (prop === null || prop === undefined || typeof prop !== "object") {
    return false;
  }
  const expr = prop as LitExpr;
  return expr.expr === "lit" && expr.value === value;
}

// ==================== Test Data ====================

const COMPONENTS_DIR = resolve(
  __dirname,
  "..",
  "components",
  "chart"
);

function loadComponentJson(filename: string): Record<string, unknown> {
  const filePath = resolve(COMPONENTS_DIR, filename);
  const content = readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}

// ==================== Tests ====================

describe("Chart stroke path fill attribute", () => {
  describe("line-chart.constela.json", () => {
    it("should have a path element with filter containing 'lineGlow'", () => {
      const json = loadComponentJson("line-chart.constela.json");

      const strokePaths = findElements(
        json,
        (el) =>
          el.tag === "path" &&
          el.props != null &&
          propLitContains(el.props["filter"], "lineGlow") &&
          el.props["stroke"] !== undefined
      );

      expect(strokePaths.length).toBeGreaterThanOrEqual(1);
    });

    it('should have fill="none" on the line stroke path to prevent SVG default black fill', () => {
      const json = loadComponentJson("line-chart.constela.json");

      const strokePaths = findElements(
        json,
        (el) =>
          el.tag === "path" &&
          el.props != null &&
          propLitContains(el.props["filter"], "lineGlow") &&
          el.props["stroke"] !== undefined
      );

      expect(strokePaths.length).toBeGreaterThanOrEqual(1);

      for (const pathEl of strokePaths) {
        expect(
          pathEl.props["fill"],
          'Line chart stroke path must have a "fill" prop to avoid SVG default fill="black"'
        ).toBeDefined();

        expect(
          propLitEquals(pathEl.props["fill"], "none"),
          'Line chart stroke path fill must be { expr: "lit", value: "none" }'
        ).toBe(true);
      }
    });
  });

  describe("area-chart.constela.json", () => {
    it("should have a path element with filter containing 'areaGlow'", () => {
      const json = loadComponentJson("area-chart.constela.json");

      const strokePaths = findElements(
        json,
        (el) =>
          el.tag === "path" &&
          el.props != null &&
          propLitContains(el.props["filter"], "areaGlow") &&
          el.props["stroke"] !== undefined
      );

      expect(strokePaths.length).toBeGreaterThanOrEqual(1);
    });

    it('should have fill="none" on the area stroke path to prevent SVG default black fill', () => {
      const json = loadComponentJson("area-chart.constela.json");

      const strokePaths = findElements(
        json,
        (el) =>
          el.tag === "path" &&
          el.props != null &&
          propLitContains(el.props["filter"], "areaGlow") &&
          el.props["stroke"] !== undefined
      );

      expect(strokePaths.length).toBeGreaterThanOrEqual(1);

      for (const pathEl of strokePaths) {
        expect(
          pathEl.props["fill"],
          'Area chart stroke path must have a "fill" prop to avoid SVG default fill="black"'
        ).toBeDefined();

        expect(
          propLitEquals(pathEl.props["fill"], "none"),
          'Area chart stroke path fill must be { expr: "lit", value: "none" }'
        ).toBe(true);
      }
    });
  });
});
