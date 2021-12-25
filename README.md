# @mntm/http [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/maxi-team/http/blob/master/LICENSE)

Speed up any node.js server. Implements [http.createServer](https://nodejs.org/api/http.html#httpcreateserveroptions-requestlistener) around [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js).

## Why

There are many frameworks that use uWebSockets.js, including:

- [uwebsockets-express](https://github.com/colyseus/uWebSockets-express)
- [hyper-express](https://github.com/kartikk221/hyper-express)
- [sifrr](https://github.com/sifrr/sifrr)
- [nanoexpress](https://github.com/nanoexpress/nanoexpress)

This package implements native node.js `createServer`, which can be integrated with any framework, for example:

```js
import Fastify from 'fastify';
import http from '@mntm/http';

const fastify = Fastify({
  serverFactory: (handler, opts) => http.createServer(handler)
});
```

## Installation

We recommend to use [yarn](https://classic.yarnpkg.com/en/docs/install/) for dependency management:

```shell
yarn add @mntm/http
```

## Contributing

Development of @mntm/http happens in the open on GitHub, and we are grateful to the community for contributing bugfixes and improvements.

## License

@mntm/http is [MIT licensed](./LICENSE).
