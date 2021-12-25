import type { IncomingMessage, OutgoingHttpHeader, OutgoingHttpHeaders, ServerResponse } from 'http';
import type { Socket } from 'net';
import type { HttpRequest, HttpResponse } from 'uws';

import { Writable } from 'stream';
import { Buffer } from 'buffer';
import { STATUS_CODES } from 'http';

import { notImplemented } from './utils.js';

const CHUNKED = 16384; // 16kB

export const response = (socket: () => Socket, request: IncomingMessage, req: HttpRequest, res: HttpResponse): ServerResponse => {
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
  instance = Object.assign(instance, {
    statusCode: 404,
    statusMessage: 'Not found',

    chunkedEncoding: false,
    shouldKeepAlive: false,
    useChunkedEncodingByDefault: false,
    sendDate: false,

    headersSent: false,

    req: request
  });

  const headers: Record<number, Record<string, string>> = {};

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
      const storedHeaders: Record<string, string> = {};

      let name = '';
      let value = '';

      if (Array.isArray(rawHeaders)) {
        if ((rawHeaders.length & 1) !== 0) {
          throw new TypeError(`The argument 'headers' is invalid. Received ${typeof rawHeaders}`);
        }

        for (let iter = 0, key = null; iter < rawHeaders.length; iter += 2) {
          key = rawHeaders[iter + 0];
          if (key) {
            name = String(key).toLowerCase();
            value = String(rawHeaders[iter + 1]);

            storedHeaders[name] = value;
          }
        }
      } else {
        const record = Object.assign({}, rawHeaders);

        for (const key in record) {
          if (key) {
            name = String(key).toLowerCase();
            value = String(record[name]);

            storedHeaders[name] = value;
          }
        }
      }

      if (instance.statusCode in headers) {
        Object.assign(headers[instance.statusCode], storedHeaders);
      } else {
        headers[instance.statusCode] = storedHeaders;
      }
    }
  };

  const setHeader = (
    name: string,
    value: number | string | readonly string[]
  ) => {
    if (instance.headersSent) {
      throw new Error('Cannot set headers after they are sent to the client');
    }

    name = String(name);

    if (typeof value === 'object' && Array.isArray(value)) {
      for (let part of value) {
        part = String(part).toLowerCase();

        headers[instance.statusCode][name] = part;
      }
    } else {
      headers[instance.statusCode][name] = String(value).toLowerCase();
    }

    return instance;
  };

  const getHeader = (
    name: string
  ) => {
    name = String(name).toLowerCase();

    return headers[instance.statusCode][name];
  };

  const getHeaders = () => {
    return headers[instance.statusCode];
  };

  const getHeaderNames = () => {
    return Object.keys(headers[instance.statusCode]);
  };

  const hasHeader = (
    name: string
  ) => {
    name = String(name).toLowerCase();

    return name in headers[instance.statusCode];
  };

  const removeHeader = (
    name: string
  ) => {
    if (instance.headersSent) {
      throw new Error('Cannot remove headers after they are sent to the client');
    }

    name = String(name).toLowerCase();

    delete headers[instance.statusCode][name];
  };

  const flushHeaders = () => {
    // @ts-expect-error false-positive
    instance.headersSent = true;

    const flush = headers[instance.statusCode];
    let value = '';

    if (flush) {
      for (const name in flush) {
        value = flush[name];

        res.writeHeader(name, value);
      }
    }
  };

  const writeContinue = (cb?: () => void) => {
    res.writeStatus('100 Continue');

    if (cb) {
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
