# @mntm/http [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/maxi-team/http/blob/master/LICENSE)

Speed up any node.js server. Implements [http.createServer](https://nodejs.org/api/http.html#httpcreateserveroptions-requestlistener) around [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js).

## Introduction

There are many frameworks that use uWebSockets.js, including:

- [uwebsockets-express](https://github.com/colyseus/uWebSockets-express)
- [hyper-express](https://github.com/kartikk221/hyper-express)
- [nanoexpress](https://github.com/nanoexpress/nanoexpress)
- [sifrr](https://github.com/sifrr/sifrr)

This package implements native node.js `createServer`, which can be integrated with any framework, for example:

```js
import Fastify from 'fastify';
import http from '@mntm/http';

const fastify = Fastify({
  serverFactory: (handler, opts) => http.createServer(handler)
});
```

## Known limitations

This package doesn't rely on `IncomingMessage` and `ServerResponse` because request and response APIs are built from scratch. They cannot be replaced with an essentially incompatible foreign prototype. This means that [Express](https://github.com/expressjs/express/blob/master/lib/middleware/init.js#L35-L36) has poor compatibility.

## Notes

The HTTP handler function is prioritized using `setImmediate`. If you are using [restana](https://github.com/BackendStack21/restana), you should set `prioRequestsProcessing` to `false` because the handler is already prioritized.

## Installation

We recommend to use [yarn](https://classic.yarnpkg.com/en/docs/install/) for dependency management:

```shell
yarn add @mntm/http
```

## Contributing

Development of @mntm/http happens in the open on GitHub, and we are grateful to the community for contributing bugfixes and improvements.

## License

@mntm/http is [MIT licensed](./LICENSE).
