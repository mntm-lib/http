import type { HttpRequest, HttpResponse } from 'uws';
import type { Server } from 'http';
import type { AddressInfo, Socket } from 'net';

import { clearTimeout, setTimeout } from 'timers';

import { lazy } from './utils';

export const socket = (server: Server, req: HttpRequest, res: HttpResponse): Socket => {
  const localAddress = server.address() as AddressInfo;

  const lazyAddress = lazy(() => {
    const address = res.getRemoteAddress();

    return {
      address: Buffer.from(address).toString('utf8'),
      family: address.byteLength === 16 ? 'IPv4' : 'IPv6'
    };
  });

  const instance = {
    address: () => localAddress,

    remotePort: 0,

    localAddress: localAddress.address,
    localPort: localAddress.port
  } as unknown as Socket;

  Object.defineProperty(instance, 'remoteAddress', {
    enumerable: true,
    get: () => lazyAddress().address
  });

  Object.defineProperty(instance, 'remoteFamily', {
    enumerable: true,
    get: () => lazyAddress().family
  });

  Object.defineProperty(instance, 'setTimeout', {
    enumerable: true,
    value(timeout: number, cb?: () => void): Socket {
      const timer = setTimeout(() => {
        res.close();

        if (cb) {
          cb();
        }
      }, timeout);

      res.onAborted(() => {
        clearTimeout(timer);
      });

      return instance;
    }
  });

  return instance as unknown as Socket;
};
