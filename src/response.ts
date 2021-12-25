import type { IncomingMessage, OutgoingHttpHeader, OutgoingHttpHeaders, ServerResponse } from 'http';
import type { Socket } from 'net';
import type { HttpResponse } from 'uws';

import { Writable } from 'stream';
import { Buffer } from 'buffer';
import { STATUS_CODES } from 'http';

import { UNDEFINED, notImplemented } from './utils.js';

const CHUNKED = 16384; // 16kB
const SET_COOKIE = 'set-cookie';

export const response = (socket: () => Socket, request: IncomingMessage, res: HttpResponse): ServerResponse => {
  let length = 0;
  let hasBody = true;
  const body: Buffer[] = [];

  let instance: ServerResponse;

  const writable = new Writable({
    write(chunk, encoding, callback) {
      const buffer = Buffer.from(chunk, encoding);

      length += buffer.byteLength;
      body.push(buffer);

      return callback();
    },
    writev(chunks, callback) {
      chunks.forEach((chunk) => {
        const buffer = Buffer.from(chunk.chunk, chunk.encoding);

        length += buffer.byteLength;
        body.push(buffer);
      });

      return callback();
    },
    final(callback) {
      if (!instance.headersSent) {
        instance.flushHeaders();
      }

      if (!hasBody || length === 0) {
        res.end();

        return callback();
      }

      const payload = body.length === 1 ? body[0] : Buffer.concat(body, length);

      if (length < CHUNKED) {
        res.end(payload);

        return callback();
      }

      let ok = false;
      let done = false;

      [ok, done] = res.tryEnd(payload, length);

      if (ok || done) {
        return callback();
      }

      res.onWritable((offset) => {
        [ok, done] = res.tryEnd(payload.slice(offset, length), length);

        if (done) {
          // eslint-disable-next-line callback-return
          callback();
        }

        return ok || done;
      });
    }
  });

  instance = writable as ServerResponse;

  // Use array syntax only for cookies
  let cookies: string[] = [];
  const headers: Record<string, string> = {};

  const setHeader = (
    name: string,
    value: number | string | readonly string[]
  ) => {
    if (instance.headersSent) {
      throw new Error('Cannot set headers after they are sent to the client');
    }

    name = String(name).toLowerCase();

    if (typeof value === 'object' && Array.isArray(value)) {
      // Fast-path for set headers
      if (value.length === 0) {
        return instance;
      }

      if (name === SET_COOKIE) {
        cookies.push.apply(cookies, value.map(String));
      } else {
        headers[name] = String(value[value.length - 1]);
      }
    } else if (name === SET_COOKIE) {
      cookies.push(String(value));
    } else {
      headers[name] = String(value);
    }

    return instance;
  };

  const writeHead = (
    w_arg1: number,
    w_arg2?: string | OutgoingHttpHeaders | OutgoingHttpHeader[],
    w_arg3?: OutgoingHttpHeaders | OutgoingHttpHeader[]
  ) => {
    const rawStatusCode = Math.trunc(w_arg1);

    if (rawStatusCode < 100 || rawStatusCode > 999) {
      throw new RangeError(`Invalid status code: ${rawStatusCode}`);
    }

    instance.statusCode = rawStatusCode;

    if (
      instance.statusCode === 204 ||
      instance.statusCode === 304 ||
      (instance.statusCode >= 100 && instance.statusCode <= 199)
    ) {
      hasBody = false;
    }

    if (typeof w_arg2 === 'string') {
      instance.statusMessage = w_arg2;
    } else if (instance.statusCode in STATUS_CODES) {
      // @ts-expect-error false-positive
      instance.statusMessage = STATUS_CODES[instance.statusCode];
    } else {
      instance.statusMessage = 'Unknown';
    }

    let rawHeaders: OutgoingHttpHeaders | OutgoingHttpHeader[] | null = null;

    if (typeof w_arg3 === 'object') {
      rawHeaders = w_arg3;
    }

    if (typeof w_arg2 === 'object') {
      rawHeaders = w_arg2;
    }

    if (rawHeaders !== null) {
      if (Array.isArray(rawHeaders)) {
        if ((rawHeaders.length & 1) !== 0) {
          throw new TypeError(`The argument 'headers' is invalid. Received ${typeof rawHeaders}`);
        }

        for (let iter = 0; iter < rawHeaders.length; iter += 2) {
          setHeader(String(rawHeaders[iter]), rawHeaders[iter + 1]);
        }
      } else {
        for (const name in rawHeaders) {
          setHeader(String(name), rawHeaders[name]!);
        }
      }
    }
  };

  const hasHeader = (
    name: string
  ) => {
    name = String(name).toLowerCase();

    if (name === SET_COOKIE) {
      return cookies.length > 0;
    }

    return name in headers;
  };

  const getHeader = (
    name: string
  ) => {
    name = String(name).toLowerCase();

    if (name === SET_COOKIE) {
      if (cookies.length > 0) {
        return cookies;
      }

      return UNDEFINED;
    }

    if (name in headers) {
      return headers[name];
    }

    return UNDEFINED;
  };

  const getHeaders = () => {
    const record: Record<string, string | string[]> = Object.assign({}, headers);

    if (cookies.length > 0) {
      record[SET_COOKIE] = cookies;
    }

    return record;
  };

  const getHeaderNames = () => {
    const keys = Object.keys(headers);

    if (cookies.length > 0) {
      keys.push(SET_COOKIE);
    }

    return keys;
  };

  const removeHeader = (
    name: string
  ) => {
    if (instance.headersSent) {
      throw new Error('Cannot remove headers after they are sent to the client');
    }

    name = String(name).toLowerCase();

    if (name === SET_COOKIE) {
      cookies = [];
    } else if (name in headers) {
      delete headers[name];
    }
  };

  const flushHeaders = () => {
    // @ts-expect-error false-positive
    instance.headersSent = true;

    for (const name in headers) {
      res.writeHeader(name, headers[name]);
    }

    for (const cookie of cookies) {
      res.writeHeader(SET_COOKIE, cookie);
    }
  };

  const writeContinue = (cb?: () => void) => {
    res.writeStatus('100 Continue');

    if (typeof cb === 'function') {
      cb();
    }
  };

  const writeProcessing = () => {
    res.writeStatus('102 Processing');
  };

  Object.defineProperty(instance, 'setTimeout', {
    enumerable: true,
    get: () => socket().setTimeout
  });

  instance = Object.assign(instance, {
    statusCode: 404,
    statusMessage: 'Not found',

    chunkedEncoding: false,
    shouldKeepAlive: false,
    useChunkedEncodingByDefault: false,
    sendDate: false,

    headersSent: false,

    req: request,

    socket,
    connection: socket,

    assignSocket: notImplemented('response#assignSocket'),
    detachSocket: notImplemented('response#detachSocket'),
    addTrailers: notImplemented('response#addTrailers'),

    writeContinue,
    writeProcessing,
    writeHead,
    writeHeader: writeHead,
    setHeader,
    getHeader,
    getHeaders,
    getHeaderNames,
    hasHeader,
    removeHeader,
    flushHeaders
  });

  instance.once('error', () => {
    res.close();
  });

  res.onAborted(() => {
    instance.destroy();
  });

  return instance;
};
