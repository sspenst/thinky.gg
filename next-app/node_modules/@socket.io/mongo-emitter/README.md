# Socket.IO MongoDB emitter

The `@socket.io/mongo-emitter` package allows you to easily communicate with a group of Socket.IO servers from another Node.js process (server-side).

![Emitter diagram](./assets/emitter.png)

It must be used in conjunction with [`@socket.io/mongo-adapter`](https://github.com/socketio/socket.io-mongo-adapter/).

Supported features:

- [broadcasting](https://socket.io/docs/v4/broadcasting-events/)
- [utility methods](https://socket.io/docs/v4/server-instance/#Utility-methods)
  - [`socketsJoin`](https://socket.io/docs/v4/server-instance/#socketsJoin)
  - [`socketsLeave`](https://socket.io/docs/v4/server-instance/#socketsLeave)
  - [`disconnectSockets`](https://socket.io/docs/v4/server-instance/#disconnectSockets)
  - [`serverSideEmit`](https://socket.io/docs/v4/server-instance/#serverSideEmit)

**Table of contents**

- [Installation](#installation)
- [Usage](#usage)
- [API](#api)
- [Known errors](#known-errors)
- [License](#license)

## Installation

```
npm install @socket.io/mongo-emitter mongodb
```

For TypeScript users, you might also need `@types/mongodb`.

## Usage

```js
const { Emitter } = require("@socket.io/mongo-emitter");
const { MongoClient } = require("mongodb");

const DB = "mydb";
const COLLECTION = "socket.io-adapter-events";

const mongoClient = new MongoClient("mongodb://localhost:27017/?replicaSet=rs0", {
  useUnifiedTopology: true,
});

const main = async () => {
  await mongoClient.connect();

  const mongoCollection = mongoClient.db(DB).collection(COLLECTION);
  const io = new Emitter(mongoCollection);

  setInterval(() => {
    io.emit("ping", new Date());
  }, 1000);
}

main();
```

## API

### `Emitter(mongoCollection[, nsp])`

```js
const io = new Emitter(mongoCollection);
```

The `mongoCollection` argument is a MongoDB [collection object](http://mongodb.github.io/node-mongodb-native/3.6/api/Collection.html) from the `mongodb` package.

### `Emitter#to(room:string):BroadcastOperator`
### `Emitter#in(room:string):BroadcastOperator`

Specifies a specific `room` that you want to emit to.

```js
io.to("room1").emit("hello");
```

### `Emitter#except(room:string):BroadcastOperator`

Specifies a specific `room` that you want to exclude from broadcasting.

```js
io.except("room2").emit("hello");
```

### `Emitter#of(namespace:string):Emitter`

Specifies a specific namespace that you want to emit to.

```js
const customNamespace = io.of("/custom");

customNamespace.emit("hello");
```

### `Emitter#socketsJoin(rooms:string|string[])`

Makes the matching socket instances join the specified rooms:

```js
// make all Socket instances join the "room1" room
io.socketsJoin("room1");

// make all Socket instances of the "admin" namespace in the "room1" room join the "room2" room
io.of("/admin").in("room1").socketsJoin("room2");
```

### `Emitter#socketsLeave(rooms:string|string[])`

Makes the matching socket instances leave the specified rooms:

```js
// make all Socket instances leave the "room1" room
io.socketsLeave("room1");

// make all Socket instances of the "admin" namespace in the "room1" room leave the "room2" room
io.of("/admin").in("room1").socketsLeave("room2");
```

### `Emitter#disconnectSockets(close:boolean)`

Makes the matching socket instances disconnect:

```js
// make all Socket instances disconnect
io.disconnectSockets();

// make all Socket instances of the "admin" namespace in the "room1" room disconnect
io.of("/admin").in("room1").disconnectSockets();

// this also works with a single socket ID
io.of("/admin").in(theSocketId).disconnectSockets();
```

### `Emitter#serverSideEmit(ev:string[,...args:any[]])`

Emits an event that will be received by each Socket.IO server of the cluster.

```js
io.serverSideEmit("ping");
```

## Known errors

- `TypeError: this.mongoCollection.insertOne is not a function`

You probably passed a MongoDB client instead of a MongoDB collection to the `Emitter` constructor.

## License

[MIT](LICENSE)
