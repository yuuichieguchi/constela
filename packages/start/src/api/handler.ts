import type { APIContext, APIModule } from '../types.js';

/** Supported HTTP methods in APIModule */
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;
type HTTPMethod = (typeof HTTP_METHODS)[number];

/**
 * Get list of allowed methods from the module
 */
function getAllowedMethods(module: APIModule): string[] {
  const methods: string[] = [];
  for (const method of HTTP_METHODS) {
    if (module[method]) {
      methods.push(method);
    }
  }
  // HEAD is allowed if GET is defined
  if (module.GET) {
    methods.push('HEAD');
  }
  // OPTIONS is always implicitly supported
  methods.push('OPTIONS');
  return methods;
}

/**
 * Create a 405 Method Not Allowed response
 */
function createMethodNotAllowedResponse(allowedMethods: string[]): Response {
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: {
      'Content-Type': 'application/json',
      Allow: allowedMethods.join(', '),
    },
  });
}

/**
 * Create a 500 Internal Server Error response
 */
function createInternalErrorResponse(error: unknown): Response {
  const isDev = process.env.NODE_ENV !== 'production';
  const message =
    isDev && error instanceof Error ? error.message : 'Internal Server Error';
  return new Response(JSON.stringify({ error: message }), {
    status: 500,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create handler function from API module
 */
export function createAPIHandler(
  module: APIModule
): (ctx: APIContext) => Promise<Response> {
  return async (ctx: APIContext): Promise<Response> => {
    const method = ctx.request.method.toUpperCase();
    const allowedMethods = getAllowedMethods(module);

    // Handle OPTIONS request
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          Allow: allowedMethods.join(', '),
        },
      });
    }

    // Handle HEAD request using GET handler
    if (method === 'HEAD') {
      const getHandler = module.GET;
      if (getHandler) {
        return new Response(null, { status: 200 });
      }
      return createMethodNotAllowedResponse(allowedMethods);
    }

    // Check if the method is a valid HTTP method in our module
    const handler = module[method as HTTPMethod];

    if (!handler) {
      return createMethodNotAllowedResponse(allowedMethods);
    }

    try {
      // Call handler and await result (works for both sync and async)
      const response = await handler(ctx);
      return response;
    } catch (error) {
      return createInternalErrorResponse(error);
    }
  };
}
