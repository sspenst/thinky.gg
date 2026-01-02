declare global {
  var db: {
    conn: typeof mongoose | null;
    mongoMemoryServer: MongoMemoryServer | null;
    promise: Promise<typeof mongoose> | null;
  };
}

export {};
