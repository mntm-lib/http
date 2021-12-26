import type {
  RequestListener,
  Server,
  ServerOptions
} from 'http';

import type {
  AddressInfo
} from 'net';

import { default as uws } from 'uws';
import { EventEmitter } from 'events';
import { EADDRINUSE } from 'constants';
import { isIP } from 'net';

import { UNDEFINED, emitNotImplemented, lazy, noop, notImplemented } from './utils.js';

import { request } from './request.js';
import { response } from './response.js';
import { socket } from './socket.js';

export const createServer = (
  s_arg1?: RequestListener | ServerOptions | undefined,
  s_arg2?: RequestListener | undefined
): Server => {
  /* eslint-disable new-cap */

  const internal = uws.App();
  let internalSocket: any = null;

  const emitter = new EventEmitter({
    captureRejections: true
  });

  let requestListener = noop;

  if (typeof s_arg1 === 'object' && s_arg1 !== null) {
    emitNotImplemented('createServer#options');
  }

  if (typeof s_arg1 === 'function') {
    requestListener = s_arg1;
  }

  if (typeof s_arg2 === 'function') {
    requestListener = s_arg2;
  }

  if (requestListener !== noop) {
    emitter.on('request', requestListener);
  }

  let serverAddress: AddressInfo | null = null;
  const server = {
    listening: false,
    address: () => serverAddress
  } as unknown as Server;

  const listen = (
    l_arg1?: any,
    l_arg2?: string | number | (() => void) | undefined,
    l_arg3?: number | (() => void) | undefined,
    l_arg4?: (() => void) | undefined
  ) => {
    const listenOptions = {
      host: '0.0.0.0',
      port: 80
    };

    let listeningListener = noop;

    if (typeof l_arg1 === 'string') {
      if (Number.isNaN(l_arg1)) {
        emitNotImplemented('listen#path');
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

    const parsedIP = isIP(listenOptions.host);
    const isLocal = parsedIP === 0 && listenOptions.host.startsWith('local');

    if (isLocal) {
      listenOptions.host = '0.0.0.0';
    }

    serverAddress = {
      address: listenOptions.host,
      port: listenOptions.port,
      family: parsedIP === 6 ? 'IPv6' : 'IPv4'
    };

    internal.any('/*', (res, req) => {
      const createSocket = lazy(() => socket(server, res));
      const createRequest = request(createSocket, req, res);
      const createResponse = response(createSocket, createRequest, res);

      emitter.emit('request', createRequest, createResponse);
    });

    internal.listen(listenOptions.host, listenOptions.port, (listening) => {
      if (listening) {
        internalSocket = listening;
        server.listening = Boolean(listening);

        listeningListener();
      } else {
        const error = new Error(`listen EADDRINUSE address: already in use ${listenOptions.host}:${listenOptions.port}`);

        Object.defineProperty(error, 'code', {
          value: EADDRINUSE
        });

        throw error;
      }
    });

    return server;
  };

  const close = (fn?: (ex?: Error) => void) => {
    let error: any = UNDEFINED;

    try {
      uws.us_listen_socket_close(internalSocket);
    } catch (ex: unknown) {
      error = ex;
    }

    if (typeof fn === 'function') {
      fn(error);
    }

    return server;
  };

  Object.assign(server, {
    listen,
    close
  });

  Object.defineProperty(server, 'maxHeadersCount', {
    enumerable: true,
    get: () => 0,
    set: notImplemented('server#maxHeadersCount')
  });

  Object.defineProperty(server, 'maxRequestsPerSocket', {
    enumerable: true,
    get: () => 0,
    set: notImplemented('server#maxRequestsPerSocket')
  });

  Object.defineProperty(server, 'maxConnections', {
    enumerable: true,
    get: () => 0,
    set: notImplemented('server#maxConnections')
  });

  Object.defineProperty(server, 'connections', {
    enumerable: true,
    get: () => 0,
    set: notImplemented('server#connections')
  });

  Object.assign(emitter, server);

  return server;
};

