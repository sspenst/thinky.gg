module.exports = async () => {
  console.warn('in globalTeardown, closing ' + global.__MONGOSERVER__?.length);

  if (global.__MONGOSERVER__) {
    for (let i = 0; i < global.__MONGOSERVER__.length; i++) {
      console.warn(`stopping mongo server ${i}`);
      const result = await global.__MONGOSERVER__[i].stop();

      console.warn('stopped = ', result);
    }
  }

  process.exit();
};
