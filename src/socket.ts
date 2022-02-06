import type { AddressInfo, Socket } from 'net';
import type { HttpResponse } from 'uws';

import { Buffer } from 'buffer';
import { setTimeout } from 'timers';

type PartialSocket = Partial<Socket>;

export class FakeSocket implements PartialSocket {
  public address: () => AddressInfo;
  public localAddress: string;
  public localPort: number;

  public remotePort = 80;

  constructor(address: AddressInfo) {
    this.address = () => address;
    this.localAddress = address.address;
    this.localPort = address.port;
  }

  public apply(res: HttpResponse) {
    const address = res.getRemoteAddress();

    return Object.assign({
      remoteAddress: Buffer.from(address).toString('utf8'),
      family: address.byteLength === 16 ? 'IPv4' : 'IPv6',

      setTimeout(timeout: number, cb?: () => void) {
        const timer = setTimeout(() => {
          res.close();

          if (typeof cb === 'function') {
            cb();
          }
        }, timeout);

        res.onAborted(() => {
          clearTimeout(timer);
        });

        return this;
      }
    }, this);
  }
}
