import type { IncomingMessage } from 'http';
import type { HttpRequest, HttpResponse } from 'uws';
import type { Socket } from 'net';

import { Readable } from 'stream';

import { UNDEFINED, notImplemented } from './utils.js';

export const request = (socket: () => Socket, req: HttpRequest, res: HttpResponse): IncomingMessage => {
  const method = req.getMethod().toUpperCase();
  const url = req.getUrl();

  const rawHeaders: string[] = [];
  const headers: Record<string, string> = {};

  req.forEach((key, value) => {
    key = key.toLowerCase();

    rawHeaders.push(key, value);
    headers[key] = value;
  });

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
    rawTrailers: [],

    url,
    method,

    headers,
    rawHeaders,

    socket,
    connection: socket
  });

  Object.defineProperty(instance, 'setTimeout', {
    enumerable: true,
    get: () => socket().setTimeout,
    set: notImplemented('request#setTimeout')
  });

  res.onAborted(() => {
    instance.destroy();
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
