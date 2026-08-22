import { isOpenReplayEligible } from '@root/components/openReplay';

const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');

const setWindow = (search: string, getItem: () => string | null) => {
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      location: { search },
      localStorage: { getItem },
    },
  });
};

describe('isOpenReplayEligible', () => {
  afterEach(() => {
    if (originalWindowDescriptor) {
      Object.defineProperty(globalThis, 'window', originalWindowDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'window');
    }
  });

  test('is false while rendering on the server', () => {
    Reflect.deleteProperty(globalThis, 'window');

    expect(isOpenReplayEligible()).toBe(false);
  });

  test('is true on the first visit when utm_source is in the URL', () => {
    setWindow('?utm_source=newsletter', () => null);

    expect(isOpenReplayEligible()).toBe(true);
  });

  test('is false when utm_source is blank', () => {
    setWindow('?utm_source=', () => null);

    expect(isOpenReplayEligible()).toBe(false);
  });

  test('is true for a previously attributed visitor', () => {
    setWindow('', () => 'newsletter');

    expect(isOpenReplayEligible()).toBe(true);
  });

  test('is false when storage is unavailable', () => {
    setWindow('', () => {
      throw new Error('localStorage unavailable');
    });

    expect(isOpenReplayEligible()).toBe(false);
  });
});
