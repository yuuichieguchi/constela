'use client';

import type React from 'react';
import { useEffect, useRef } from 'react';
import type { CompiledProgram } from '@constela/compiler';
import { createApp } from '@constela/runtime';
import type { AppInstance } from '@constela/runtime';

export interface ConstelaEmbedProps {
  program: CompiledProgram;
  ssrHtml?: string;
  className?: string;
  id?: string;
}

export function ConstelaEmbed({
  program,
  ssrHtml,
  className,
  id,
}: ConstelaEmbedProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<AppInstance | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    appRef.current = createApp(program, containerRef.current);

    return () => {
      if (appRef.current) {
        appRef.current.destroy();
        appRef.current = null;
      }
    };
  }, [program]);

  if (ssrHtml) {
    // SECURITY: ssrHtml is expected to come from renderToString() which
    // properly escapes all user content. Do not pass untrusted HTML directly.
    return (
      <div
        ref={containerRef}
        className={className}
        id={id}
        data-testid="constela-container"
        dangerouslySetInnerHTML={{ __html: ssrHtml }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      id={id}
      data-testid="constela-container"
    />
  );
}
