module.exports = async () => {
  await global.__MONGOSERVER__.stop();
};
