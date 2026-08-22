import {
  getPlaylistEndSources,
  waitUntilPlayable,
} from '@root/contexts/musicContext';

class FakeAudio extends EventTarget {
  readyState = 0;
}

const originalMediaElementDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'HTMLMediaElement');

describe('music audio readiness', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    Object.defineProperty(globalThis, 'HTMLMediaElement', {
      configurable: true,
      value: { HAVE_FUTURE_DATA: 3 },
    });
  });

  afterEach(() => {
    jest.useRealTimers();

    if (originalMediaElementDescriptor) {
      Object.defineProperty(globalThis, 'HTMLMediaElement', originalMediaElementDescriptor);
    } else {
      Reflect.deleteProperty(globalThis, 'HTMLMediaElement');
    }
  });

  test('repairs readiness when canplay fires after the loading timeout', async () => {
    const audio = new FakeAudio();
    const onLateReadiness = jest.fn();
    const readiness = waitUntilPlayable(audio as unknown as HTMLAudioElement, onLateReadiness);

    jest.advanceTimersByTime(15000);

    await expect(readiness).resolves.toBe('timeout');

    audio.dispatchEvent(new Event('canplay'));
    audio.dispatchEvent(new Event('error'));

    expect(onLateReadiness).toHaveBeenCalledTimes(1);
    expect(onLateReadiness).toHaveBeenCalledWith('ready');
  });

  test('reports a late failure once after the loading timeout', async () => {
    const audio = new FakeAudio();
    const onLateReadiness = jest.fn();
    const readiness = waitUntilPlayable(audio as unknown as HTMLAudioElement, onLateReadiness);

    jest.advanceTimersByTime(15000);

    await expect(readiness).resolves.toBe('timeout');

    audio.dispatchEvent(new Event('error'));
    audio.dispatchEvent(new Event('canplay'));

    expect(onLateReadiness).toHaveBeenCalledTimes(1);
    expect(onLateReadiness).toHaveBeenCalledWith('failed');
  });

  test('uses the ambient layer to advance when the original layer is unavailable', () => {
    const ambient = new FakeAudio() as unknown as HTMLAudioElement;
    const original = new FakeAudio() as unknown as HTMLAudioElement;

    expect(getPlaylistEndSources({
      ambient,
      ambientReady: true,
      original,
      originalReady: false,
    })).toEqual([ambient]);
  });

  test('tracks both ready layers while guarding duplicate advancement by load', () => {
    const ambient = new FakeAudio() as unknown as HTMLAudioElement;
    const original = new FakeAudio() as unknown as HTMLAudioElement;

    expect(getPlaylistEndSources({
      ambient,
      ambientReady: true,
      original,
      originalReady: true,
    })).toEqual([original, ambient]);
  });
});
