module.exports = async () => {
  console.warn('in globalTeardown');
  await global.__MONGOSERVER__?.stop();
};
