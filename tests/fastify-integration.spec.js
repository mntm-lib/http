/* globals describe, it, expect */

import { createServer } from '../lib/index.mjs';
import { fastify } from 'fastify';
import { request } from 'http';

describe('fastify integration', () => {
  const PORT = 3000;

  /** @type {import('fastify').FastifyInstance} */
  let server;

  it('should create server', (done) => {
    server = fastify({
      serverFactory: (handler) => createServer(handler)
    });

    done();
  });

  it('should register handler', (done) => {
    server.get('/hello', (req, reply) => {
      reply.headers({
        'Set-Cookie': 'test1=1',
        'set-cookie': 'test2=2',
        'set-CookiE': ['test3=3', 'test4=4'],
        'x-foo': 12
      });

      reply.send('payload');
    });

    done();
  });

  it('should start server', (done) => {
    server.listen(PORT, (ex, address) => {
      expect(ex).toBeNull();
      expect(address).toBe(`http://127.0.0.1:${PORT}`);

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
    server.close(done);
  });
});
