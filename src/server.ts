import type {
  RequestListener,
  Server,
  ServerOptions
} from 'http';
import type { AddressInfo } from 'net';
import type { TemplatedApp, us_listen_socket } from 'uws';

import { EventEmitter } from 'events';
import { isIP } from 'net';
import { EADDRINUSE } from 'constants';

import { default as uws } from 'uws';

import { UNDEFINED, emitNotImplemented, noop, throwNotImplemented } from './utils';

import { compat } from './compat.js';
import { FakeSocket } from './socket.js';
import { CompatIncomingMessage } from './request.js';
import { CompatServerResponse } from './response.js';

const StaticEmitterOptions = {
  captureRejections: true
} as const;

export class CompatServer extends EventEmitter implements Server {
  public maxHeadersCount = 0;
  public maxRequestsPerSocket = 0;
  public maxConnections = 0;
  public connections = 0;

  public listening = false;

  public setTimeout = noop;
  public timeout = 0;
  public headersTimeout = 0;
  public keepAliveTimeout = 0;
  public requestTimeout = 0;

  private __socket!: FakeSocket;
  private __serverAddress: AddressInfo | null = null;
  private __serverSocket: us_listen_socket | null = null;
  private readonly __server: TemplatedApp;

  constructor(
    s_arg1?: RequestListener | ServerOptions | undefined,
    s_arg2?: RequestListener | undefined
  ) {
    super(StaticEmitterOptions);

    let requestListener = noop;

    if (typeof s_arg1 === 'object' && s_arg1 !== null) {
      throwNotImplemented('createServer#options');
    }

    if (typeof s_arg1 === 'function') {
      requestListener = s_arg1;
    }

    if (typeof s_arg2 === 'function') {
      requestListener = s_arg2;
    }

    if (requestListener !== noop) {
      this.on('request', requestListener);
    }

    this.__server = uws.App();
  }

  public listen(
    l_arg1?: any,
    l_arg2?: string | number | (() => void) | undefined,
    l_arg3?: number | (() => void) | undefined,
    l_arg4?: (() => void) | undefined
  ) {
    const listenOptions = {
      host: '0.0.0.0',
      port: 80
    };

    let listeningListener = noop;

    if (typeof l_arg1 === 'string') {
      if (Number.isNaN(l_arg1)) {
        throwNotImplemented('listen#path');
      } else {
        listenOptions.port = Number(l_arg1);
      }
    }

    if (typeof l_arg1 === 'number') {
      listenOptions.port = Number(l_arg1);
    }

    if (typeof l_arg1 === 'object' && l_arg1 !== null) {
      if (typeof l_arg1.backlog !== 'undefined') {
        emitNotImplemented('listen#options.backlog');
      }

      if (typeof l_arg1.exclusive !== 'undefined') {
        emitNotImplemented('listen#options.exclusive');
      }

      if (typeof l_arg1.readableAll !== 'undefined') {
        emitNotImplemented('listen#options.readableAll');
      }

      if (typeof l_arg1.writableAll !== 'undefined') {
        emitNotImplemented('listen#options.writableAll');
      }

      if (typeof l_arg1.ipv6Only !== 'undefined') {
        emitNotImplemented('listen#options.ipv6Only');
      }

      listenOptions.host = (l_arg1.host && String(l_arg1.host)) || listenOptions.host;
      listenOptions.port = Number(l_arg1.port) || listenOptions.port;
    }

    if (typeof l_arg2 === 'string') {
      listenOptions.host = l_arg2;
    }

    if (typeof l_arg2 === 'number') {
      emitNotImplemented('listen#backlog');
    }

    if (typeof l_arg2 === 'function') {
      listeningListener = l_arg2;
    }

    if (typeof l_arg3 === 'number') {
      emitNotImplemented('listen#backlog');
    }

    if (typeof l_arg3 === 'function') {
      listeningListener = l_arg3;
    }

    if (typeof l_arg4 === 'function') {
      listeningListener = l_arg4;
    }

    if (listeningListener !== noop) {
      this.on('listening', listeningListener);
    }

    const parsedIP = isIP(listenOptions.host);
    const isLocal = parsedIP === 0 && listenOptions.host === 'localhost';

    if (isLocal) {
      listenOptions.host = '127.0.0.1';
    }

    this.__serverAddress = {
      address: listenOptions.host,
      port: listenOptions.port,
      family: parsedIP === 6 ? 'IPv6' : 'IPv4'
    };

    this.__socket = new FakeSocket(this.__serverAddress);

    this.__server.any('/*', async (res, req) => {
      const createSocket = this.__socket.apply(res);
      const createRequest = new CompatIncomingMessage(createSocket, req, res);
      const createResponse = new CompatServerResponse(createSocket, createRequest, res);

      this.emit('request', createRequest, createResponse);
    });

    this.__server.listen(listenOptions.host, listenOptions.port, (listening) => {
      if (listening) {
        this.__serverSocket = listening;
        this.listening = Boolean(listening);

        this.emit('listening');
      } else {
        const error = new Error(`listen EADDRINUSE address: already in use ${listenOptions.host}:${listenOptions.port}`);

        Object.defineProperty(error, 'code', {
          value: EADDRINUSE
        });

        throw error;
      }
    });

    return this;
  }

  close(fn?: (ex?: Error) => void) {
    let error: any = UNDEFINED;

    try {
      if (this.__serverSocket) {
        uws.us_listen_socket_close(this.__serverSocket);
      } else {
        if (typeof fn === 'function') {
          fn(error);
        }

        this.emit('close', error);

        return this;
      }
    } catch (ex: unknown) {
      error = ex;
    }

    if (typeof fn === 'function') {
      fn(error);
    }

    this.emit('close', error);

    return this;
  }

  public address() {
    return this.__serverAddress;
  }

  public getConnections(cb: (error: Error | null, count: number) => void) {
    return cb(null, 0);
  }

  public ref() {
    return this;
  }

  public unref() {
    return this;
  }
}

export const createServer = (
  s_arg1?: RequestListener | ServerOptions | undefined,
  s_arg2?: RequestListener | undefined
) => {
  compat();

  return new CompatServer(s_arg1, s_arg2);
};
