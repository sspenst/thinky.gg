module.exports = async () => {
  console.warn('in globalTeardown');

  if (global.__MONGOSERVER__) {
    for (let i = 0; i < global.__MONGOSERVER__.length; i++) {
      console.warn(`stopping mongo server ${i}`);
      await global.__MONGOSERVER__[i].stop();
    }
  }
};
