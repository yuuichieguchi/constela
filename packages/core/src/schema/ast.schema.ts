/**
 * JSON Schema for Constela AST
 *
 * This module defines the JSON Schema for validating Constela AST structures.
 * The schema is kept for documentation and external tooling purposes.
 */

export const astSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'https://constela.dev/schemas/ast.json',
  title: 'Constela AST',
  description: 'Schema for Constela UI framework AST',
  type: 'object',
  required: ['version', 'state', 'actions', 'view'],
  additionalProperties: false,
  properties: {
    version: {
      type: 'string',
      const: '1.0',
    },
    state: {
      type: 'object',
      additionalProperties: {
        $ref: '#/$defs/StateField',
      },
    },
    actions: {
      type: 'array',
      items: {
        $ref: '#/$defs/ActionDefinition',
      },
    },
    view: {
      $ref: '#/$defs/ViewNode',
    },
    styles: {
      type: 'object',
      additionalProperties: { $ref: '#/$defs/StylePreset' },
    },
    components: {
      type: 'object',
      additionalProperties: { $ref: '#/$defs/ComponentDef' },
    },
  },
  $defs: {
    // ==================== Expressions ====================
    Expression: {
      oneOf: [
        { $ref: '#/$defs/LitExpr' },
        { $ref: '#/$defs/StateExpr' },
        { $ref: '#/$defs/VarExpr' },
        { $ref: '#/$defs/BinExpr' },
        { $ref: '#/$defs/NotExpr' },
        { $ref: '#/$defs/ParamExpr' },
        { $ref: '#/$defs/CondExpr' },
        { $ref: '#/$defs/GetExpr' },
        { $ref: '#/$defs/IndexExpr' },
        { $ref: '#/$defs/StyleExpr' },
        { $ref: '#/$defs/ValidityExpr' },
      ],
    },
    LitExpr: {
      type: 'object',
      required: ['expr', 'value'],
      additionalProperties: false,
      properties: {
        expr: { type: 'string', const: 'lit' },
        value: {
          oneOf: [
            { type: 'string' },
            { type: 'number' },
            { type: 'boolean' },
            { type: 'null' },
            { type: 'array' },
          ],
        },
      },
    },
    StateExpr: {
      type: 'object',
      required: ['expr', 'name'],
      additionalProperties: false,
      properties: {
        expr: { type: 'string', const: 'state' },
        name: { type: 'string' },
        path: { type: 'string' },
      },
    },
    VarExpr: {
      type: 'object',
      required: ['expr', 'name'],
      additionalProperties: false,
      properties: {
        expr: { type: 'string', const: 'var' },
        name: { type: 'string' },
        path: { type: 'string' },
      },
    },
    BinExpr: {
      type: 'object',
      required: ['expr', 'op', 'left', 'right'],
      additionalProperties: false,
      properties: {
        expr: { type: 'string', const: 'bin' },
        op: {
          type: 'string',
          enum: ['+', '-', '*', '/', '==', '!=', '<', '<=', '>', '>=', '&&', '||'],
        },
        left: { $ref: '#/$defs/Expression' },
        right: { $ref: '#/$defs/Expression' },
      },
    },
    NotExpr: {
      type: 'object',
      required: ['expr', 'operand'],
      additionalProperties: false,
      properties: {
        expr: { type: 'string', const: 'not' },
        operand: { $ref: '#/$defs/Expression' },
      },
    },
    ParamExpr: {
      type: 'object',
      required: ['expr', 'name'],
      additionalProperties: false,
      properties: {
        expr: { type: 'string', const: 'param' },
        name: { type: 'string' },
        path: { type: 'string' },
      },
    },
    CondExpr: {
      type: 'object',
      required: ['expr', 'if', 'then', 'else'],
      additionalProperties: false,
      properties: {
        expr: { type: 'string', const: 'cond' },
        if: { $ref: '#/$defs/Expression' },
        then: { $ref: '#/$defs/Expression' },
        else: { $ref: '#/$defs/Expression' },
      },
    },
    GetExpr: {
      type: 'object',
      required: ['expr', 'base', 'path'],
      additionalProperties: false,
      properties: {
        expr: { type: 'string', const: 'get' },
        base: { $ref: '#/$defs/Expression' },
        path: { type: 'string' },
      },
    },
    IndexExpr: {
      type: 'object',
      required: ['expr', 'base', 'key'],
      additionalProperties: false,
      properties: {
        expr: { type: 'string', const: 'index' },
        base: { $ref: '#/$defs/Expression' },
        key: { $ref: '#/$defs/Expression' },
      },
    },
    StyleExpr: {
      type: 'object',
      required: ['expr', 'name'],
      additionalProperties: false,
      properties: {
        expr: { type: 'string', const: 'style' },
        name: { type: 'string' },
        variants: {
          type: 'object',
          additionalProperties: { $ref: '#/$defs/Expression' },
        },
      },
    },
    ValidityExpr: {
      type: 'object',
      required: ['expr', 'ref'],
      additionalProperties: false,
      properties: {
        expr: { type: 'string', const: 'validity' },
        ref: { type: 'string' },
        property: {
          type: 'string',
          enum: ['valid', 'valueMissing', 'typeMismatch', 'patternMismatch', 'tooLong', 'tooShort', 'rangeUnderflow', 'rangeOverflow', 'customError', 'message'],
        },
      },
    },

    // ==================== Style Presets ====================
    StylePreset: {
      type: 'object',
      required: ['base'],
      additionalProperties: false,
      properties: {
        base: { type: 'string' },
        variants: {
          type: 'object',
          additionalProperties: {
            type: 'object',
            additionalProperties: { type: 'string' },
          },
        },
        defaultVariants: {
          type: 'object',
          additionalProperties: { type: 'string' },
        },
        compoundVariants: {
          type: 'array',
          items: { $ref: '#/$defs/CompoundVariant' },
        },
      },
    },
    CompoundVariant: {
      type: 'object',
      required: ['class'],
      additionalProperties: { type: 'string' },
      properties: {
        class: { type: 'string' },
      },
    },

    // ==================== State Fields ====================
    StateField: {
      oneOf: [
        { $ref: '#/$defs/NumberField' },
        { $ref: '#/$defs/StringField' },
        { $ref: '#/$defs/ListField' },
        { $ref: '#/$defs/BooleanField' },
        { $ref: '#/$defs/ObjectField' },
      ],
    },
    NumberField: {
      type: 'object',
      required: ['type', 'initial'],
      additionalProperties: false,
      properties: {
        type: { type: 'string', const: 'number' },
        initial: { type: 'number' },
      },
    },
    StringField: {
      type: 'object',
      required: ['type', 'initial'],
      additionalProperties: false,
      properties: {
        type: { type: 'string', const: 'string' },
        initial: {
          oneOf: [
            { type: 'string' },
            { $ref: '#/$defs/CookieInitialExpr' },
          ],
        },
      },
    },
    CookieInitialExpr: {
      type: 'object',
      required: ['expr', 'key', 'default'],
      additionalProperties: false,
      properties: {
        expr: { type: 'string', const: 'cookie' },
        key: { type: 'string' },
        default: { type: 'string' },
      },
    },
    ListField: {
      type: 'object',
      required: ['type', 'initial'],
      additionalProperties: false,
      properties: {
        type: { type: 'string', const: 'list' },
        initial: { type: 'array' },
      },
    },
    BooleanField: {
      type: 'object',
      required: ['type', 'initial'],
      additionalProperties: false,
      properties: {
        type: { type: 'string', const: 'boolean' },
        initial: { type: 'boolean' },
      },
    },
    ObjectField: {
      type: 'object',
      required: ['type', 'initial'],
      additionalProperties: false,
      properties: {
        type: { type: 'string', const: 'object' },
        initial: { type: 'object' },
      },
    },

    // ==================== Action Steps ====================
    ActionStep: {
      oneOf: [
        { $ref: '#/$defs/SetStep' },
        { $ref: '#/$defs/UpdateStep' },
        { $ref: '#/$defs/FetchStep' },
        { $ref: '#/$defs/DelayStep' },
        { $ref: '#/$defs/IntervalStep' },
        { $ref: '#/$defs/ClearTimerStep' },
        { $ref: '#/$defs/FocusStep' },
        { $ref: '#/$defs/IfStep' },
      ],
    },
    SetStep: {
      type: 'object',
      required: ['do', 'target', 'value'],
      additionalProperties: false,
      properties: {
        do: { type: 'string', const: 'set' },
        target: { type: 'string' },
        value: { $ref: '#/$defs/Expression' },
      },
    },
    UpdateStep: {
      type: 'object',
      required: ['do', 'target', 'operation'],
      additionalProperties: false,
      properties: {
        do: { type: 'string', const: 'update' },
        target: { type: 'string' },
        operation: {
          type: 'string',
          enum: ['increment', 'decrement', 'push', 'pop', 'remove', 'toggle', 'merge', 'replaceAt', 'insertAt', 'splice'],
        },
        value: { $ref: '#/$defs/Expression' },
        index: { $ref: '#/$defs/Expression' },
        deleteCount: { $ref: '#/$defs/Expression' },
      },
    },
    FetchStep: {
      type: 'object',
      required: ['do', 'url'],
      additionalProperties: false,
      properties: {
        do: { type: 'string', const: 'fetch' },
        url: { $ref: '#/$defs/Expression' },
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'DELETE'],
        },
        body: { $ref: '#/$defs/Expression' },
        result: { type: 'string' },
        onSuccess: {
          type: 'array',
          items: { $ref: '#/$defs/ActionStep' },
        },
        onError: {
          type: 'array',
          items: { $ref: '#/$defs/ActionStep' },
        },
      },
    },
    DelayStep: {
      type: 'object',
      required: ['do', 'ms', 'then'],
      additionalProperties: false,
      properties: {
        do: { type: 'string', const: 'delay' },
        ms: { $ref: '#/$defs/Expression' },
        then: {
          type: 'array',
          items: { $ref: '#/$defs/ActionStep' },
        },
        result: { type: 'string' },
      },
    },
    IntervalStep: {
      type: 'object',
      required: ['do', 'ms', 'action'],
      additionalProperties: false,
      properties: {
        do: { type: 'string', const: 'interval' },
        ms: { $ref: '#/$defs/Expression' },
        action: { type: 'string' },
        result: { type: 'string' },
      },
    },
    ClearTimerStep: {
      type: 'object',
      required: ['do', 'target'],
      additionalProperties: false,
      properties: {
        do: { type: 'string', const: 'clearTimer' },
        target: { $ref: '#/$defs/Expression' },
      },
    },
    FocusStep: {
      type: 'object',
      required: ['do', 'target', 'operation'],
      additionalProperties: false,
      properties: {
        do: { type: 'string', const: 'focus' },
        target: { $ref: '#/$defs/Expression' },
        operation: {
          type: 'string',
          enum: ['focus', 'blur', 'select'],
        },
        onSuccess: {
          type: 'array',
          items: { $ref: '#/$defs/ActionStep' },
        },
        onError: {
          type: 'array',
          items: { $ref: '#/$defs/ActionStep' },
        },
      },
    },
    IfStep: {
      type: 'object',
      required: ['do', 'condition', 'then'],
      additionalProperties: false,
      properties: {
        do: { type: 'string', const: 'if' },
        condition: { $ref: '#/$defs/Expression' },
        then: {
          type: 'array',
          items: { $ref: '#/$defs/ActionStep' },
        },
        else: {
          type: 'array',
          items: { $ref: '#/$defs/ActionStep' },
        },
      },
    },

    // ==================== Event Handler ====================
    EventHandler: {
      type: 'object',
      required: ['event', 'action'],
      additionalProperties: false,
      properties: {
        event: { type: 'string' },
        action: { type: 'string' },
        payload: { $ref: '#/$defs/Expression' },
        debounce: { type: 'number' },
        throttle: { type: 'number' },
        options: { $ref: '#/$defs/EventHandlerOptions' },
      },
    },
    EventHandlerOptions: {
      type: 'object',
      additionalProperties: false,
      properties: {
        threshold: { type: 'number' },
        rootMargin: { type: 'string' },
        once: { type: 'boolean' },
      },
    },

    // ==================== Action Definition ====================
    ActionDefinition: {
      type: 'object',
      required: ['name', 'steps'],
      additionalProperties: false,
      properties: {
        name: { type: 'string' },
        steps: {
          type: 'array',
          items: { $ref: '#/$defs/ActionStep' },
        },
      },
    },

    // ==================== View Nodes ====================
    ViewNode: {
      oneOf: [
        { $ref: '#/$defs/ElementNode' },
        { $ref: '#/$defs/TextNode' },
        { $ref: '#/$defs/IfNode' },
        { $ref: '#/$defs/EachNode' },
        { $ref: '#/$defs/ComponentNode' },
        { $ref: '#/$defs/SlotNode' },
        { $ref: '#/$defs/MarkdownNode' },
        { $ref: '#/$defs/CodeNode' },
        { $ref: '#/$defs/PortalNode' },
      ],
    },
    ElementNode: {
      type: 'object',
      required: ['kind', 'tag'],
      additionalProperties: false,
      properties: {
        kind: { type: 'string', const: 'element' },
        tag: { type: 'string' },
        props: {
          type: 'object',
          additionalProperties: {
            oneOf: [
              { $ref: '#/$defs/Expression' },
              { $ref: '#/$defs/EventHandler' },
            ],
          },
        },
        children: {
          type: 'array',
          items: { $ref: '#/$defs/ViewNode' },
        },
      },
    },
    TextNode: {
      type: 'object',
      required: ['kind', 'value'],
      additionalProperties: false,
      properties: {
        kind: { type: 'string', const: 'text' },
        value: { $ref: '#/$defs/Expression' },
      },
    },
    IfNode: {
      type: 'object',
      required: ['kind', 'condition', 'then'],
      additionalProperties: false,
      properties: {
        kind: { type: 'string', const: 'if' },
        condition: { $ref: '#/$defs/Expression' },
        then: { $ref: '#/$defs/ViewNode' },
        else: { $ref: '#/$defs/ViewNode' },
      },
    },
    EachNode: {
      type: 'object',
      required: ['kind', 'items', 'as', 'body'],
      additionalProperties: false,
      properties: {
        kind: { type: 'string', const: 'each' },
        items: { $ref: '#/$defs/Expression' },
        as: { type: 'string' },
        index: { type: 'string' },
        key: { $ref: '#/$defs/Expression' },
        body: { $ref: '#/$defs/ViewNode' },
      },
    },
    ComponentNode: {
      type: 'object',
      required: ['kind', 'name'],
      additionalProperties: false,
      properties: {
        kind: { type: 'string', const: 'component' },
        name: { type: 'string' },
        props: {
          type: 'object',
          additionalProperties: { $ref: '#/$defs/Expression' },
        },
        children: {
          type: 'array',
          items: { $ref: '#/$defs/ViewNode' },
        },
      },
    },
    SlotNode: {
      type: 'object',
      required: ['kind'],
      additionalProperties: false,
      properties: {
        kind: { type: 'string', const: 'slot' },
      },
    },
    MarkdownNode: {
      type: 'object',
      required: ['kind', 'content'],
      additionalProperties: false,
      properties: {
        kind: { type: 'string', const: 'markdown' },
        content: { $ref: '#/$defs/Expression' },
      },
    },
    CodeNode: {
      type: 'object',
      required: ['kind', 'language', 'content'],
      additionalProperties: false,
      properties: {
        kind: { type: 'string', const: 'code' },
        language: { $ref: '#/$defs/Expression' },
        content: { $ref: '#/$defs/Expression' },
      },
    },
    PortalNode: {
      type: 'object',
      required: ['kind', 'target', 'children'],
      additionalProperties: false,
      properties: {
        kind: { type: 'string', const: 'portal' },
        target: { type: 'string' },
        children: {
          type: 'array',
          items: { $ref: '#/$defs/ViewNode' },
        },
      },
    },

    // ==================== Component Definition ====================
    ParamDef: {
      type: 'object',
      required: ['type'],
      additionalProperties: false,
      properties: {
        type: {
          type: 'string',
          enum: ['string', 'number', 'boolean', 'json'],
        },
        required: { type: 'boolean' },
      },
    },
    ComponentDef: {
      type: 'object',
      required: ['view'],
      additionalProperties: false,
      properties: {
        params: {
          type: 'object',
          additionalProperties: { $ref: '#/$defs/ParamDef' },
        },
        view: { $ref: '#/$defs/ViewNode' },
      },
    },
  },
} as const;
