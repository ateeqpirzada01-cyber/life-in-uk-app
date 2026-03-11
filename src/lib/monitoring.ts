import * as Sentry from '@sentry/react-native';

export const monitoring = {
  initialize(dsn: string): void {
    if (!dsn) return;

    Sentry.init({
      dsn,
      enabled: !__DEV__,
      tracesSampleRate: 0.1,
      sendDefaultPii: false,
    });
  },

  setUser(userId: string): void {
    Sentry.setUser({ id: userId });
  },

  clearUser(): void {
    Sentry.setUser(null);
  },

  captureException(error: Error, context?: Record<string, any>): void {
    if (__DEV__) {
      console.warn('[monitoring]', error.message ?? error, context);
      return;
    }
    if (context) {
      Sentry.withScope((scope) => {
        scope.setExtras(context);
        Sentry.captureException(error);
      });
    } else {
      Sentry.captureException(error);
    }
  },

  captureMessage(msg: string, level: Sentry.SeverityLevel = 'info'): void {
    if (__DEV__) {
      console.warn('[monitoring]', msg);
      return;
    }
    Sentry.captureMessage(msg, level);
  },
};
