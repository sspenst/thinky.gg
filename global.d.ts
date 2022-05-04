/* eslint-disable no-var */

declare global {
  var mongoose: {
    conn: typeof import('mongoose') | null,
    promise: Promise<typeof import('mongoose')> | null,
  };
}

export {};
