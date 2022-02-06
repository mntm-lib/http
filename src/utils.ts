import { emitWarning } from 'process';

type AnyFunction = (...args: any[]) => any;

export const emitNotImplemented = (method: string): void => {
  emitWarning(method, {
    code: 'NOT_IMPLEMENTED'
  });
};

export const throwNotImplemented = (method: string): never => {
  const error = new Error(method);

  Object.defineProperty(error, 'code', {
    value: 'NOT_IMPLEMENTED'
  });

  throw error;
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

export const hasBody = (method: string) => {
  return method !== 'HEAD' && method !== 'GET' && method !== 'OPTIONS';
};
