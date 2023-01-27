# Installation
> `npm install --save @types/request-ip`

# Summary
This package contains type definitions for request-ip (https://github.com/pbojinov/request-ip).

# Details
Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/request-ip.
## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/request-ip/index.d.ts)
````ts
// Type definitions for request-ip
// Project: https://github.com/pbojinov/request-ip
// Definitions by: Adam Babcock <https://github.com/mrhen>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
// TypeScript Version: 2.3

/// <reference types="node" />

import * as http from 'http';

interface RequestHeaders extends http.IncomingHttpHeaders {
    'x-client-ip'?: string | undefined;
    'x-forwarded-for'?: string | undefined;
    'x-real-ip'?: string | undefined;
    'x-cluster-client-ip'?: string | undefined;
    'x-forwarded'?: string | undefined;
    'forwarded-for'?: string | undefined;
    'forwarded'?: string | undefined;
}

interface Request {
    headers: RequestHeaders;
    connection?: {
        remoteAddress?: string | undefined;
        socket?: {
            remoteAddress?: string | undefined
        } | undefined;
    } | undefined;
    info?: {
        remoteAddress?: string | undefined
    } | undefined;
    socket?: {
        remoteAddress?: string | undefined
    } | undefined;
}

interface Options {
    attributeName: string;
}

export declare function getClientIp(req: Request): string | null;

export function mw(options?: Options): (req: Request, res: any, next: any) => any;

declare global {
  namespace Express {
    interface Request {
      clientIp?: string | undefined;
    }
  }
}

````

### Additional Details
 * Last updated: Wed, 07 Jul 2021 18:02:23 GMT
 * Dependencies: [@types/node](https://npmjs.com/package/@types/node)
 * Global values: none

# Credits
These definitions were written by [Adam Babcock](https://github.com/mrhen).
