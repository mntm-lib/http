import type { IncomingMessage } from 'http';
import type { HttpRequest, HttpResponse } from 'uws';
import type { Socket } from 'net';

import { Readable } from 'stream';

import { UNDEFINED, lazy } from './utils.js';

export const request = (socket: () => Socket, req: HttpRequest, res: HttpResponse): IncomingMessage => {
  let instance: IncomingMessage;

  const readable = new Readable({
    read() {
      // Stub method
    }
  });

  instance = readable as IncomingMessage;
  instance = Object.assign(instance, {
    aborted: false,
    complete: false,

    statusCode: UNDEFINED,
    statusMessage: UNDEFINED,

    trailers: {},
    rawTrailers: []
  });

  const getHeaders = lazy(() => {
    const rawHeaders: string[] = [];
    const headers: Record<string, string> = {};

    req.forEach((key, value) => {
      key = key.toLowerCase();

      rawHeaders.push(key, value);
      headers[key] = value;
    });

    return {
      rawHeaders,
      headers
    } as const;
  });

  Object.defineProperty(instance, 'url', {
    enumerable: true,
    get: lazy(() => req.getUrl())
  });

  Object.defineProperty(instance, 'method', {
    enumerable: true,
    get: lazy(() => req.getMethod().toUpperCase())
  });

  Object.defineProperty(instance, 'headers', {
    enumerable: true,
    get: () => getHeaders().headers
  });

  Object.defineProperty(instance, 'rawHeaders', {
    enumerable: true,
    get: () => getHeaders().rawHeaders
  });

  Object.defineProperty(instance, 'setTimeout', {
    enumerable: true,
    get: () => socket().setTimeout
  });

  instance = Object.assign(instance, {
    socket,
    connection: socket
  });

  res.onAborted(() => {
    instance.aborted = true;
  });

  instance.once('error', res.close);

  res.onData((chunk, last) => {
    instance.push(Buffer.from(chunk, 0, chunk.byteLength));

    if (last) {
      instance.push(null);

      instance.complete = true;
    }
  });

  return instance;
};
