/**
 * Realtime Data Binding
 *
 * Automatically updates state when messages arrive from WebSocket/SSE connections.
 */

export interface BindingConfig {
  connection: string;
  eventType?: string;
  target: string;
  path?: (string | number)[];
  transform?: (data: unknown) => unknown;
  patch?: boolean;
}

type SetStateFn = (
  target: string,
  value: unknown,
  pathOrOptions?: (string | number)[] | { patch: boolean }
) => void;

interface InternalBinding {
  id: string;
  config: BindingConfig;
  setState: SetStateFn;
}

export interface BindingManager {
  bind(config: BindingConfig, setState: SetStateFn): string;
  unbind(id: string): boolean;
  unbindByConnection(connection: string): void;
  unbindByTarget(target: string): void;
  handleMessage(connection: string, data: unknown, eventType?: string): void;
  getBindings(): BindingConfig[];
  dispose(): void;
}

export function createBindingManager(): BindingManager {
  const bindings = new Map<string, InternalBinding>();

  function bind(config: BindingConfig, setState: SetStateFn): string {
    const id = crypto.randomUUID();
    bindings.set(id, { id, config, setState });
    return id;
  }

  function unbind(id: string): boolean {
    return bindings.delete(id);
  }

  function unbindByConnection(connection: string): void {
    for (const [id, binding] of bindings) {
      if (binding.config.connection === connection) {
        bindings.delete(id);
      }
    }
  }

  function unbindByTarget(target: string): void {
    for (const [id, binding] of bindings) {
      if (binding.config.target === target) {
        bindings.delete(id);
      }
    }
  }

  function handleMessage(
    connection: string,
    data: unknown,
    eventType?: string
  ): void {
    for (const binding of bindings.values()) {
      const { config, setState } = binding;

      // Check connection match
      if (config.connection !== connection) {
        continue;
      }

      // Check event type filter
      // If binding has eventType, message must have matching eventType
      // If binding has no eventType, accept any message
      if (config.eventType !== undefined) {
        if (eventType !== config.eventType) {
          continue;
        }
      }

      // Apply transform if provided
      let value = data;
      if (config.transform) {
        value = config.transform(data);
      }

      // Call setState with appropriate arguments
      if (config.patch === true) {
        setState(config.target, value, { patch: true });
      } else if (config.path !== undefined) {
        setState(config.target, value, config.path);
      } else {
        setState(config.target, value);
      }
    }
  }

  function getBindings(): BindingConfig[] {
    return Array.from(bindings.values()).map((b) => ({ ...b.config }));
  }

  function dispose(): void {
    bindings.clear();
  }

  return {
    bind,
    unbind,
    unbindByConnection,
    unbindByTarget,
    handleMessage,
    getBindings,
    dispose,
  };
}
