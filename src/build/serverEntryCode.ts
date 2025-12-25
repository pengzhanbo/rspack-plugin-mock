import type { ResolvePluginOptions } from '../options'
import type { ServerBuildOption } from '../types'
import { toArray } from '@pengzhanbo/utils'

export function generatorServerEntryCode({
  proxies,
  wsPrefix,
  cookiesOptions,
  bodyParserOptions,
  priority,
  build,
}: ResolvePluginOptions): string {
  const { serverPort, log } = build as ServerBuildOption
  return `import { createServer } from 'node:http';
import connect from 'connect';
import corsMiddleware from 'cors';
import { 
  baseMiddleware,
  createLogger,
  mockWebSocket,
  processMockData,
  processRawData
} from 'rspack-plugin-mock/server';
import rawData from './mock-data.js';

const app = connect();
const server = createServer(app);
const logger = createLogger('mock-server', '${log}');
const proxies = ${JSON.stringify(proxies)};
const wsProxies = ${JSON.stringify(toArray(wsPrefix))};
const cookiesOptions = ${JSON.stringify(cookiesOptions)};
const bodyParserOptions = ${JSON.stringify(bodyParserOptions)};
const priority = ${JSON.stringify(priority)};
const mockConfig = { 
  mockData: processMockData(processRawData(rawData)),
  on: () => {},
};

mockWebSocket(mockConfig, server, { wsProxies, cookiesOptions, logger });

app.use(corsMiddleware());
app.use(baseMiddleware(mockConfig, {
  formidableOptions: { multiples: true },
  proxies,
  priority,
  cookiesOptions,
  bodyParserOptions,
  logger,
}));

server.listen(${serverPort});

console.log('listen: http://localhost:${serverPort}');
`
}
