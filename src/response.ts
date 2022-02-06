import type { IncomingMessage, OutgoingHttpHeader, OutgoingHttpHeaders, ServerResponse } from 'http';
import type { HttpResponse } from 'uws';
import type { Socket } from 'net';

import type { CompatIncomingMessage } from './request.js';
import type { FakeSocket } from './socket.js';

import { Writable } from 'stream';
import { Buffer } from 'buffer';
import { STATUS_CODES } from 'http';

import { UNDEFINED, noop } from './utils.js';

type BufferEncoding = 'ascii' | 'utf8' | 'utf-8' | 'utf16le' | 'ucs2' | 'ucs-2' | 'base64' | 'base64url' | 'latin1' | 'binary' | 'hex';

const CHUNKED = 16384; // 16kB
const SET_COOKIE = 'set-cookie';
const CONTENT_LENGTH = 'content-length';

export class CompatServerResponse extends Writable implements ServerResponse {
  private __hasBody = true;
  private __bodyLength = 0;
  private readonly __body: Buffer[] = [];

  private __cookies: string[] = [];
  private __headers: Record<string, string> = {};

  private readonly __res: HttpResponse;

  public get finished() {
    return this.writableEnded;
  }

  public headersSent = false;

  public statusCode = 404;
  public statusMessage = 'Not found';

  public chunkedEncoding = false;
  public shouldKeepAlive = false;
  public useChunkedEncodingByDefault = false;
  public sendDate = false;

  public socket: Socket;
  public connection: Socket;

  public req: IncomingMessage;

  _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    const buffer = Buffer.from(chunk, encoding);

    this.__bodyLength += buffer.byteLength;
    this.__body.push(buffer);

    return callback();
  }

  _writev(chunks: any[], callback: (error?: Error | null) => void) {
    chunks.forEach((chunk) => {
      const buffer = Buffer.from(chunk.chunk, chunk.encoding);

      this.__bodyLength += buffer.byteLength;
      this.__body.push(buffer);
    });

    return callback();
  }

  _final(callback: (error?: Error | null) => void) {
    if (!this.headersSent) {
      this.flushHeaders();
    }

    if (!this.__hasBody || this.__bodyLength === 0) {
      this.__res.end();

      return callback();
    }

    const payload = this.__body.length === 1 ?
      this.__body[0] :
      Buffer.concat(this.__body, this.__bodyLength);

    if (this.__bodyLength < CHUNKED) {
      this.__res.end(payload);

      return callback();
    }

    let ok = false;
    let done = false;

    [ok, done] = this.__res.tryEnd(payload, this.__bodyLength);

    if (ok || done) {
      return callback();
    }

    this.__res.onWritable((offset) => {
      [ok, done] = this.__res.tryEnd(payload.slice(offset, this.__bodyLength), this.__bodyLength);

      if (done) {
        // eslint-disable-next-line callback-return
        callback();
      }

      return ok || done;
    });
  }

  constructor(socket: FakeSocket, req: CompatIncomingMessage, res: HttpResponse) {
    super();

    this.socket = socket as unknown as Socket;
    this.connection = socket as unknown as Socket;

    this.req = req as unknown as IncomingMessage;
    this.__res = res;

    this.once('error', res.close);
    res.onAborted(this.destroy.bind(this));
  }

  public setHeader(
    name: string,
    value: number | string | readonly string[]
  ) {
    name = name.toLowerCase();

    if (typeof value === 'object' && Array.isArray(value)) {
      // Fast-path for set headers
      if (value.length === 0) {
        return this;
      }

      if (name === SET_COOKIE) {
        this.__cookies.push.apply(this.__cookies, value);
      } else {
        this.__headers[name] = value[value.length - 1].toString();
      }
    } else if (name === SET_COOKIE) {
      this.__cookies.push(value.toString());
    } else {
      this.__headers[name] = value.toString();
    }

    return this;
  }

  public hasHeader(name: string) {
    name = name.toLowerCase();

    if (name === SET_COOKIE) {
      return this.__cookies.length > 0;
    }

    return name in this.__headers;
  }

  public getHeader(name: string) {
    name = name.toLowerCase();

    if (name === SET_COOKIE) {
      if (this.__cookies.length > 0) {
        return this.__cookies;
      }

      return UNDEFINED;
    }

    return this.__headers[name];
  }

  public getHeaders() {
    const record: Record<string, string | string[]> = Object.assign({}, this.__headers);

    if (this.__cookies.length > 0) {
      record[SET_COOKIE] = this.__cookies;
    }

    return record;
  }

  public getHeaderNames() {
    const keys = Object.keys(this.__headers);

    if (this.__cookies.length > 0) {
      keys.push(SET_COOKIE);
    }

    return keys;
  }

  public removeHeader(name: string) {
    if (this.headersSent) {
      throw new Error('Cannot remove headers after they are sent to the client');
    }

    name = name.toLowerCase();

    if (name === SET_COOKIE) {
      this.__cookies = [];
    } else if (name in this.__headers) {
      // Pre-check
      delete this.__headers[name];
    }
  }

  public flushHeaders() {
    this.headersSent = true;

    for (const name in this.__headers) {
      // Content-Length is written internally
      if (name !== CONTENT_LENGTH) {
        this.__res.writeHeader(name, this.__headers[name]);
      }
    }

    if (this.__cookies.length === 0) {
      // Fast-path empty cookies
      return;
    }

    for (const cookie of this.__cookies) {
      this.__res.writeHeader(SET_COOKIE, cookie);
    }
  }

  public writeHead(
    w_arg1: number,
    w_arg2?: string | OutgoingHttpHeaders | OutgoingHttpHeader[],
    w_arg3?: OutgoingHttpHeaders | OutgoingHttpHeader[]
  ) {
    const rawStatusCode = Math.trunc(w_arg1);

    if (rawStatusCode < 100 || rawStatusCode > 999) {
      throw new RangeError(`Invalid status code: ${rawStatusCode}`);
    }

    this.statusCode = rawStatusCode;

    if (
      this.statusCode === 204 ||
      this.statusCode === 304 ||
      (this.statusCode >= 100 && this.statusCode <= 199)
    ) {
      this.__hasBody = false;
    }

    if (typeof w_arg2 === 'string') {
      this.statusMessage = w_arg2;
    } else if (this.statusCode in STATUS_CODES) {
      // @ts-expect-error false-positive
      this.statusMessage = STATUS_CODES[this.statusCode];
    } else {
      this.statusMessage = 'Unknown';
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
          this.setHeader(rawHeaders[iter].toString(), rawHeaders[iter + 1]);
        }
      } else {
        for (const name in rawHeaders) {
          this.setHeader(name.toString(), rawHeaders[name]!);
        }
      }
    }

    return this;
  }

  public writeHeader = this.writeHead;

  public assignSocket = noop;
  public detachSocket = noop;

  public addTrailers = noop;

  public writeContinue(cb?: () => void) {
    this.__res.writeStatus('100 Continue');

    if (typeof cb === 'function') {
      cb();
    }
  }

  public writeProcessing() {
    this.__res.writeStatus('102 Processing');
  }

  public setTimeout(msecs: number, callback?: () => void) {
    this.socket.setTimeout(msecs, callback);

    return this;
  }
}
