describe('Email test enhanced', () => {
  const DAY = 24 * 60 * 60;

  const tests = [
    {
      name: 'regular email digest',
      timeline: [
        [0 * DAY, 'user1visit'],
        [1 * DAY, 'emailjob'],
        ['test1'],
        [30 * DAY, 'user1visit'],
      ],
      test1: () => {
        console.log('test1');
      }
    }
  ];
});
