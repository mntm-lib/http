/* globals describe, it, expect */

import { createServer } from '../lib/index.mjs';
import { default as restana } from 'restana';
import { request } from 'http';

describe.each([{
  prioritize: false
}, {
  prioritize: true
}])('restana integration with prioRequestsProcessing = $prioritize', ({ prioritize }) => {
  const PORT = prioritize ? 3003 : 3002;

  /** @type {import('restana').Service<any>} */
  let server;

  it('should create server', (done) => {
    server = restana({
      server: createServer(),
      prioRequestsProcessing: prioritize
    });

    done();
  });

  it('should register handler', (done) => {
    server.get('/hello', (req, res) => {
      res.send('payload', 200, {
        'Set-Cookie': 'test1=1',
        'set-cookie': 'test2=2',
        'set-CookiE': ['test3=3', 'test4=4'],
        'x-foo': 12
      });
    });

    done();
  });

  it('should start server', (done) => {
    server.start(PORT).then(() => {
      done();
    }).catch(done);
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
    server.close().then(() => {
      done();
    }).catch(done);
  });
});
