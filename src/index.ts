import {
  createServer
} from './server.js';

import * as http from 'http';

const patched = {};
const wildcard = Object.assign(patched, http, {
  createServer,
  default: patched
});

export {
  createServer,
  wildcard as default
};

export {
  Agent,
  ClientRequest,
  IncomingMessage,
  METHODS,
  OutgoingMessage,
  STATUS_CODES,
  Server,
  ServerResponse,
  get,
  globalAgent,
  maxHeaderSize,
  request
} from 'http';

export type {
  AgentOptions,
  ClientRequestArgs,
  IncomingHttpHeaders,
  InformationEvent,
  OutgoingHttpHeader,
  OutgoingHttpHeaders,
  RequestListener,
  RequestOptions,
  ServerOptions
} from 'http';
