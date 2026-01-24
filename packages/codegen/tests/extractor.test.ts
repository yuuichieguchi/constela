/**
 * Test suite for AST Type Extractor
 *
 * Coverage:
 * - Expression types extraction (18 types)
 * - ActionStep types extraction (19 types)
 * - ViewNode types extraction (9 types)
 * - JSDoc description extraction
 * - Property information extraction
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

import {
  extractExpressionTypes,
  extractActionStepTypes,
  extractViewNodeTypes,
  extractAstTypes,
} from '../src/extractor.js';

import type { ExtractedType, PropertyInfo, ExtractionResult } from '../src/types.js';

// ==================== Setup ====================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const AST_SOURCE_PATH = resolve(__dirname, '../../core/src/types/ast.ts');

// Expected type names from ast.ts
const EXPECTED_EXPRESSION_TYPES = [
  'lit',
  'state',
  'var',
  'bin',
  'not',
  'param',
  'cond',
  'get',
  'route',
  'import',
  'data',
  'ref',
  'index',
  'style',
  'concat',
  'validity',
  'call',
  'lambda',
] as const;

const EXPECTED_ACTION_STEP_TYPES = [
  'set',
  'update',
  'setPath',
  'fetch',
  'storage',
  'clipboard',
  'navigate',
  'import',
  'call',
  'subscribe',
  'dispose',
  'dom',
  'send',
  'close',
  'delay',
  'interval',
  'clearTimer',
  'focus',
  'if',
] as const;

const EXPECTED_VIEW_NODE_TYPES = [
  'element',
  'text',
  'if',
  'each',
  'component',
  'slot',
  'markdown',
  'code',
  'portal',
] as const;

// ==================== Expression Types ====================

describe('extractExpressionTypes', () => {
  let expressionTypes: ExtractedType[];

  beforeAll(() => {
    expressionTypes = extractExpressionTypes(AST_SOURCE_PATH);
  });

  describe('when extracting from ast.ts', () => {
    it('should return 18 expression types', () => {
      expect(expressionTypes).toHaveLength(18);
    });

    it('should extract all expected expression type names', () => {
      const typeNames = expressionTypes.map((t) => t.name);
      for (const expectedName of EXPECTED_EXPRESSION_TYPES) {
        expect(typeNames).toContain(expectedName);
      }
    });

    it('should have ExtractedType structure for each type', () => {
      for (const type of expressionTypes) {
        expect(type).toHaveProperty('name');
        expect(type).toHaveProperty('description');
        expect(type).toHaveProperty('properties');
        expect(typeof type.name).toBe('string');
        expect(typeof type.description).toBe('string');
        expect(Array.isArray(type.properties)).toBe(true);
      }
    });
  });

  describe('JSDoc description extraction', () => {
    it('should extract description for LitExpr', () => {
      const litType = expressionTypes.find((t) => t.name === 'lit');
      expect(litType).toBeDefined();
      expect(litType!.description).toBe(
        'Literal expression - represents a constant value'
      );
    });

    it('should extract description for StateExpr', () => {
      const stateType = expressionTypes.find((t) => t.name === 'state');
      expect(stateType).toBeDefined();
      expect(stateType!.description).toBe(
        'State expression - references a state field'
      );
    });

    it('should extract description for BinExpr', () => {
      const binType = expressionTypes.find((t) => t.name === 'bin');
      expect(binType).toBeDefined();
      expect(binType!.description).toBe(
        'Binary expression - arithmetic, comparison, or logical operation'
      );
    });
  });

  describe('property extraction', () => {
    it('should extract properties for LitExpr', () => {
      const litType = expressionTypes.find((t) => t.name === 'lit');
      expect(litType).toBeDefined();
      expect(litType!.properties).toHaveLength(2);

      const exprProp = litType!.properties.find((p) => p.name === 'expr');
      expect(exprProp).toBeDefined();
      expect(exprProp!.type).toBe("'lit'");
      expect(exprProp!.optional).toBe(false);

      const valueProp = litType!.properties.find((p) => p.name === 'value');
      expect(valueProp).toBeDefined();
      expect(valueProp!.optional).toBe(false);
    });

    it('should extract optional properties correctly', () => {
      const stateType = expressionTypes.find((t) => t.name === 'state');
      expect(stateType).toBeDefined();

      const pathProp = stateType!.properties.find((p) => p.name === 'path');
      expect(pathProp).toBeDefined();
      expect(pathProp!.optional).toBe(true);
    });

    it('should extract NotExpr with operand property (NOT value)', () => {
      const notType = expressionTypes.find((t) => t.name === 'not');
      expect(notType).toBeDefined();

      const operandProp = notType!.properties.find((p) => p.name === 'operand');
      expect(operandProp).toBeDefined();
      expect(operandProp!.type).toBe('Expression');

      // Should NOT have a 'value' property
      const valueProp = notType!.properties.find((p) => p.name === 'value');
      expect(valueProp).toBeUndefined();
    });

    it('should extract CallExpr properties', () => {
      const callType = expressionTypes.find((t) => t.name === 'call');
      expect(callType).toBeDefined();

      const targetProp = callType!.properties.find((p) => p.name === 'target');
      expect(targetProp).toBeDefined();
      expect(targetProp!.type).toBe('Expression');

      const methodProp = callType!.properties.find((p) => p.name === 'method');
      expect(methodProp).toBeDefined();
      expect(methodProp!.type).toBe('string');

      const argsProp = callType!.properties.find((p) => p.name === 'args');
      expect(argsProp).toBeDefined();
      expect(argsProp!.optional).toBe(true);
    });

    it('should extract LambdaExpr properties', () => {
      const lambdaType = expressionTypes.find((t) => t.name === 'lambda');
      expect(lambdaType).toBeDefined();

      const paramProp = lambdaType!.properties.find((p) => p.name === 'param');
      expect(paramProp).toBeDefined();
      expect(paramProp!.type).toBe('string');

      const indexProp = lambdaType!.properties.find((p) => p.name === 'index');
      expect(indexProp).toBeDefined();
      expect(indexProp!.optional).toBe(true);

      const bodyProp = lambdaType!.properties.find((p) => p.name === 'body');
      expect(bodyProp).toBeDefined();
      expect(bodyProp!.type).toBe('Expression');
    });
  });
});

// ==================== ActionStep Types ====================

describe('extractActionStepTypes', () => {
  let actionStepTypes: ExtractedType[];

  beforeAll(() => {
    actionStepTypes = extractActionStepTypes(AST_SOURCE_PATH);
  });

  describe('when extracting from ast.ts', () => {
    it('should return 19 action step types', () => {
      expect(actionStepTypes).toHaveLength(19);
    });

    it('should extract all expected action step type names', () => {
      const typeNames = actionStepTypes.map((t) => t.name);
      for (const expectedName of EXPECTED_ACTION_STEP_TYPES) {
        expect(typeNames).toContain(expectedName);
      }
    });

    it('should have ExtractedType structure for each type', () => {
      for (const type of actionStepTypes) {
        expect(type).toHaveProperty('name');
        expect(type).toHaveProperty('description');
        expect(type).toHaveProperty('properties');
        expect(typeof type.name).toBe('string');
        expect(typeof type.description).toBe('string');
        expect(Array.isArray(type.properties)).toBe(true);
      }
    });
  });

  describe('JSDoc description extraction', () => {
    it('should extract description for SetStep', () => {
      const setType = actionStepTypes.find((t) => t.name === 'set');
      expect(setType).toBeDefined();
      expect(setType!.description).toBe(
        'Set step - sets a state field to a new value'
      );
    });

    it('should extract description for FetchStep', () => {
      const fetchType = actionStepTypes.find((t) => t.name === 'fetch');
      expect(fetchType).toBeDefined();
      expect(fetchType!.description).toBe(
        'Fetch step - makes an HTTP request'
      );
    });

    it('should extract description for IfStep', () => {
      const ifType = actionStepTypes.find((t) => t.name === 'if');
      expect(ifType).toBeDefined();
      expect(ifType!.description).toBe(
        'If step - conditional action execution'
      );
    });
  });

  describe('property extraction', () => {
    it('should extract properties for SetStep', () => {
      const setType = actionStepTypes.find((t) => t.name === 'set');
      expect(setType).toBeDefined();
      expect(setType!.properties).toHaveLength(3);

      const doProp = setType!.properties.find((p) => p.name === 'do');
      expect(doProp).toBeDefined();
      expect(doProp!.type).toBe("'set'");

      const targetProp = setType!.properties.find((p) => p.name === 'target');
      expect(targetProp).toBeDefined();
      expect(targetProp!.type).toBe('string');

      const valueProp = setType!.properties.find((p) => p.name === 'value');
      expect(valueProp).toBeDefined();
      expect(valueProp!.type).toBe('Expression');
    });

    it('should extract optional properties for FetchStep', () => {
      const fetchType = actionStepTypes.find((t) => t.name === 'fetch');
      expect(fetchType).toBeDefined();

      const methodProp = fetchType!.properties.find((p) => p.name === 'method');
      expect(methodProp).toBeDefined();
      expect(methodProp!.optional).toBe(true);

      const onSuccessProp = fetchType!.properties.find(
        (p) => p.name === 'onSuccess'
      );
      expect(onSuccessProp).toBeDefined();
      expect(onSuccessProp!.optional).toBe(true);
    });

    it('should extract UpdateStep with operation property', () => {
      const updateType = actionStepTypes.find((t) => t.name === 'update');
      expect(updateType).toBeDefined();

      const operationProp = updateType!.properties.find(
        (p) => p.name === 'operation'
      );
      expect(operationProp).toBeDefined();
      expect(operationProp!.type).toBe('UpdateOperation');
    });
  });
});

// ==================== ViewNode Types ====================

describe('extractViewNodeTypes', () => {
  let viewNodeTypes: ExtractedType[];

  beforeAll(() => {
    viewNodeTypes = extractViewNodeTypes(AST_SOURCE_PATH);
  });

  describe('when extracting from ast.ts', () => {
    it('should return 9 view node types', () => {
      expect(viewNodeTypes).toHaveLength(9);
    });

    it('should extract all expected view node type names', () => {
      const typeNames = viewNodeTypes.map((t) => t.name);
      for (const expectedName of EXPECTED_VIEW_NODE_TYPES) {
        expect(typeNames).toContain(expectedName);
      }
    });

    it('should have ExtractedType structure for each type', () => {
      for (const type of viewNodeTypes) {
        expect(type).toHaveProperty('name');
        expect(type).toHaveProperty('description');
        expect(type).toHaveProperty('properties');
        expect(typeof type.name).toBe('string');
        expect(typeof type.description).toBe('string');
        expect(Array.isArray(type.properties)).toBe(true);
      }
    });
  });

  describe('JSDoc description extraction', () => {
    it('should extract description for ElementNode', () => {
      const elementType = viewNodeTypes.find((t) => t.name === 'element');
      expect(elementType).toBeDefined();
      expect(elementType!.description).toBe(
        'Element node - represents an HTML element'
      );
    });

    it('should extract description for EachNode', () => {
      const eachType = viewNodeTypes.find((t) => t.name === 'each');
      expect(eachType).toBeDefined();
      expect(eachType!.description).toBe('Each node - list rendering');
    });

    it('should extract description for PortalNode', () => {
      const portalType = viewNodeTypes.find((t) => t.name === 'portal');
      expect(portalType).toBeDefined();
      expect(portalType!.description).toBe(
        'Portal node - renders children to a different DOM location'
      );
    });
  });

  describe('property extraction', () => {
    it('should extract properties for ElementNode', () => {
      const elementType = viewNodeTypes.find((t) => t.name === 'element');
      expect(elementType).toBeDefined();

      const kindProp = elementType!.properties.find((p) => p.name === 'kind');
      expect(kindProp).toBeDefined();
      expect(kindProp!.type).toBe("'element'");

      const tagProp = elementType!.properties.find((p) => p.name === 'tag');
      expect(tagProp).toBeDefined();
      expect(tagProp!.type).toBe('string');

      const refProp = elementType!.properties.find((p) => p.name === 'ref');
      expect(refProp).toBeDefined();
      expect(refProp!.optional).toBe(true);
    });

    it('should extract properties for EachNode', () => {
      const eachType = viewNodeTypes.find((t) => t.name === 'each');
      expect(eachType).toBeDefined();

      const itemsProp = eachType!.properties.find((p) => p.name === 'items');
      expect(itemsProp).toBeDefined();
      expect(itemsProp!.type).toBe('Expression');

      const asProp = eachType!.properties.find((p) => p.name === 'as');
      expect(asProp).toBeDefined();
      expect(asProp!.type).toBe('string');

      const keyProp = eachType!.properties.find((p) => p.name === 'key');
      expect(keyProp).toBeDefined();
      expect(keyProp!.optional).toBe(true);
    });

    it('should extract properties for SlotNode', () => {
      const slotType = viewNodeTypes.find((t) => t.name === 'slot');
      expect(slotType).toBeDefined();

      const nameProp = slotType!.properties.find((p) => p.name === 'name');
      expect(nameProp).toBeDefined();
      expect(nameProp!.optional).toBe(true);
    });
  });
});

// ==================== extractAstTypes (Combined) ====================

describe('extractAstTypes', () => {
  let result: ExtractionResult;

  beforeAll(() => {
    result = extractAstTypes(AST_SOURCE_PATH);
  });

  it('should return ExtractionResult with all three arrays', () => {
    expect(result).toHaveProperty('expressions');
    expect(result).toHaveProperty('actionSteps');
    expect(result).toHaveProperty('viewNodes');
    expect(Array.isArray(result.expressions)).toBe(true);
    expect(Array.isArray(result.actionSteps)).toBe(true);
    expect(Array.isArray(result.viewNodes)).toBe(true);
  });

  it('should extract 18 expression types', () => {
    expect(result.expressions).toHaveLength(18);
  });

  it('should extract 19 action step types', () => {
    expect(result.actionSteps).toHaveLength(19);
  });

  it('should extract 9 view node types', () => {
    expect(result.viewNodes).toHaveLength(9);
  });
});

// ==================== PropertyInfo Structure ====================

describe('PropertyInfo structure', () => {
  let expressionTypes: ExtractedType[];

  beforeAll(() => {
    expressionTypes = extractExpressionTypes(AST_SOURCE_PATH);
  });

  it('should have correct PropertyInfo fields', () => {
    const litType = expressionTypes.find((t) => t.name === 'lit');
    expect(litType).toBeDefined();

    for (const prop of litType!.properties) {
      expect(prop).toHaveProperty('name');
      expect(prop).toHaveProperty('type');
      expect(prop).toHaveProperty('optional');
      expect(prop).toHaveProperty('description');
      expect(typeof prop.name).toBe('string');
      expect(typeof prop.type).toBe('string');
      expect(typeof prop.optional).toBe('boolean');
      expect(typeof prop.description).toBe('string');
    }
  });

  it('should extract JSDoc comments for properties', () => {
    const routeType = expressionTypes.find((t) => t.name === 'route');
    expect(routeType).toBeDefined();

    const sourceProp = routeType!.properties.find((p) => p.name === 'source');
    expect(sourceProp).toBeDefined();
    // source has JSDoc comment: "defaults to 'param'"
    expect(sourceProp!.description).toContain('param');
  });
});
