import { emitWarning } from 'process';

type AnyFunction = (...args: any[]) => any;

// @ts-expect-error never
export const emitNotImplemented = function emitNotImplemented(method: string): never {
  if (
    process.env.NODE_ENV === 'production' ||
    process.env.UNSAFE_HTTP === '1' ||
    process.env.UNSAFE_HTTP === 'true'
  ) {
    emitWarning(method, {
      code: 'NOT_IMPLEMENTED'
    });
  } else {
    const error = new Error(`${method} is not implemented. On production the same warning will be triggered in production instead of this error.`);

    Object.defineProperty(error, 'code', {
      value: 'ERR_NOT_IMPLEMENTED'
    });

    // @ts-expect-error this
    Error.captureStackTrace(error, this);

    throw error;
  }
};

export const notImplemented = (method: string): AnyFunction => {
  return () => emitNotImplemented(method);
};

export const lazy = <T>(fn: () => T) => {
  let computed: T | null = null;

  return () => {
    if (computed === null) {
      computed = fn();
    }

    return computed;
  };
};

// eslint-disable-next-line no-undefined
export const UNDEFINED = undefined;

export const noop: AnyFunction = () => {
  // Noop
};
