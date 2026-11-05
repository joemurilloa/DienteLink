import * as Sentry from '@sentry/react';
import { saveFailureReport, scrubSentryEvent } from './sentryScrub';

let ready = false;
const reported = new WeakSet<object>();

/** Solo arranca si Vercel tiene VITE_SENTRY_DSN. Sin esa variable no se envía nada. */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (typeof dsn !== 'string' || !dsn.startsWith('https://')) return;

  Sentry.init({
    dsn,
    tracesSampleRate: 0,
    maxBreadcrumbs: 0,
    attachStacktrace: false,
    enhanceFetchErrorMessages: false,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
      frameContextLines: 0,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      mcp: { inputs: false, outputs: false },
    },
    integrations: (integrations) =>
      integrations.filter((integration) => integration.name !== 'Breadcrumbs' && integration.name !== 'HttpContext'),
    beforeBreadcrumb: () => null,
    beforeSend(event) {
      return scrubSentryEvent(event);
    },
  });
  ready = true;
}

/** Avisa el fallo de guardado con tabla y código. El texto del paciente no entra en el aviso. */
export function reportSaveFailure(err: unknown, tableHint?: string): void {
  if (!ready) return;
  if (err && typeof err === 'object') {
    if (reported.has(err)) return;
    reported.add(err);
  }
  const report = saveFailureReport(err, tableHint);
  Sentry.captureMessage(report.message, {
    level: 'error',
    tags: report.tags,
  });
}
