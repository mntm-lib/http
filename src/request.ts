import type { IncomingMessage } from 'http';
import type { Socket } from 'net';
import type { HttpRequest, HttpResponse } from 'uws';

import type { FakeSocket } from './socket.js';

import { Readable } from 'stream';

import { hasBody, noop } from './utils.js';

const StaticHttpVersion = '1.1';
const StaticHttpVersionMajor = 1;
const StaticHttpVersionMinor = 1;

const StaticReadableOptions = {
  read: noop
} as const;

export class CompatIncomingMessage extends Readable implements IncomingMessage {
  public rawHeaders: string[] = [];
  public headers: Record<string, string> = {};

  public trailers = {};
  public rawTrailers = [];

  public aborted = false;
  public complete = false;

  public url: string;
  public method: string;

  public socket: Socket;
  public connection: Socket;

  public statusCode = 0;
  public statusMessage = '';

  public httpVersion = StaticHttpVersion;
  public httpVersionMajor = StaticHttpVersionMajor;
  public httpVersionMinor = StaticHttpVersionMinor;

  constructor(socket: FakeSocket, req: HttpRequest, res: HttpResponse) {
    super(StaticReadableOptions);

    this.once('error', res.close);
    res.onAborted(this.destroy.bind(this));

    this.method = req.getMethod().toUpperCase();
    this.url = req.getUrl();

    this.socket = socket as unknown as Socket;
    this.connection = socket as unknown as Socket;

    req.forEach((key, value) => {
      key = key.toLowerCase();

      this.rawHeaders.push(key, value);
      this.headers[key] = value;
    });

    if (hasBody(this.method)) {
      res.onData((chunk, last) => {
        this.push(Buffer.from(chunk, 0, chunk.byteLength));

        if (last) {
          this.push(null);

          this.complete = true;
        }
      });
    } else {
      this.complete = true;
    }
  }

  public setTimeout(msecs: number, callback?: () => void) {
    this.socket.setTimeout(msecs, callback);

    return this;
  }
}
