/* globals describe, it, expect */

import { createServer } from '../lib/index.mjs';
import { default as polkadot } from 'polkadot';
import { request } from 'http';

describe('polkadot integration', () => {
  const PORT = 3001;

  let app;

  it('should create server and register handler', (done) => {
    app = polkadot((req, res) => {
      if (req.path === '/hello') {
        res.writeHead(200, {
          'Set-Cookie': 'test1=1',
          'set-cookie': 'test2=2',
          'set-CookiE': ['test3=3', 'test4=4'],
          'x-foo': 12
        });

        res.end('payload');
      } else {
        res.end();
      }
    });

    app.server = createServer();

    done();
  });

  it('should start server', (done) => {
    app.listen(PORT, (ex) => {
      expect(ex).toBeUndefined();

      done();
    });
  });

  it('should GET 200 and string content on /hello', (done) => {
    request({
      host: 'localhost',
      port: PORT,
      protocol: 'http:',
      path: '/hello',
      method: 'GET'
    }, (res) => {
      expect(res.headers['set-cookie']).toEqual(['test1=1', 'test2=2', 'test3=3', 'test4=4']);
      expect(res.headers['x-foo']).toBe('12');

      let payload = '';

      res.on('data', (chunk) => {
        payload += chunk;
      });

      res.on('end', () => {
        expect(payload).toBe('payload');

        done();
      });
    }).end();
  });

  it('should successfully terminate server', (done) => {
    app.server.close(done);
  });
});
