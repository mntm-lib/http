import { createServer as createNativeServer } from 'http';
import { createServer as createFastServer } from '../lib/index.mjs';
import { default as createLowServer } from 'low-http-server';

import { exec } from 'child_process';
import { promisify } from 'util';

process.on('unhandledRejection', (reason) => {
  throw reason;
});

const headers = {
  'set-cookie': '1=1',
  'x-foo': 'bar'
};

const payload = '{"test":"payload"}';

const native = promisify((cb) => {
  const server = createNativeServer();

  server.on('request', (req, res) => {
    res.writeHead(200, headers);
    res.end(payload);
  });

  server.listen(3000, () => {
    cb(null, promisify((done) => server.close(() => done())));
  });
});

const fast = promisify((cb) => {
  const server = createFastServer();

  server.on('request', (req, res) => {
    res.writeHead(200, headers);
    res.end(payload);
  });

  server.listen(3000, () => {
    cb(null, promisify((done) => server.close(() => done())));
  });
});

const low = promisify((cb) => {
  const server = createLowServer();

  server.on('request', (req, res) => {
    res.writeHead(200, headers);
    res.end(payload);
  });

  server.listen(3000, () => {
    cb(null, promisify((done) => server.close(() => done())));
  });
});

// Fast();

(async () => {
  // Return;

  const run = promisify(exec);

  let current = 0;
  const names = ['low', 'fast', 'native'];

  for (const implementation of [low, fast, native]) {
    console.log(names[current++]);

    const close = await implementation();

    const result = [];

    result.push(await run('wrk -t1 -c1 -d5s http://127.0.0.1:3000/wrk'));
    result.push(await run('wrk -t8 -c40 -d5s http://127.0.0.1:3000/wrk'));

    console.log(result.map((out) => out.stdout).join('\r\n'));

    await close();
  }
})();
