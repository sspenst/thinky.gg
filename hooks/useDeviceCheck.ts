import { useEffect, useState } from 'react';

interface CustomWindow extends Window {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MSStream: any;
}

declare let window: CustomWindow;

export enum ScreenSize {
  NONE,
  XS,
  SM,
  MD,
  LG,
  XL,
  '2XL',
}

export type DeviceInfo = {
  isMobile: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isFirefox: boolean;
  isWindows: boolean;
  isLinux: boolean;
  isMac: boolean;
  screenSize: ScreenSize;
};

const useDeviceCheck = (initialUserAgentString: string): DeviceInfo => {
  const initialMobile = initialUserAgentString ? /mobile/i.test(initialUserAgentString) : false;
  const initialAndroid = initialUserAgentString ? /android/i.test(initialUserAgentString) : false;
  const initialiOS = initialUserAgentString ? /iPad|iPhone|iPod/.test(initialUserAgentString) : false;
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: initialMobile,
    isAndroid: initialAndroid,
    isIOS: initialiOS,
    isFirefox: initialUserAgentString ? /firefox/i.test(initialUserAgentString) : false,
    isWindows: initialUserAgentString ? /windows/i.test(initialUserAgentString) : false,
    isLinux: initialUserAgentString ? /linux/i.test(initialUserAgentString) : false,
    isMac: initialUserAgentString ? /mac/i.test(initialUserAgentString) : false,
    screenSize: (initialAndroid || initialiOS) ? ScreenSize.SM : ScreenSize.NONE, // set a smart default for mobile
  });

  const updateScreenSize = () => {
    const width = window.innerWidth;
    let screenSize = ScreenSize.XS;

    // using tailwind's mobile-first approach to match existing prefixes
    // https://tailwindcss.com/docs/responsive-design
    if (width >= 1536) {
      screenSize = ScreenSize['2XL'];
    } else if (width >= 1280) {
      screenSize = ScreenSize.XL;
    } else if (width >= 1024) {
      screenSize = ScreenSize.LG;
    } else if (width >= 768) {
      screenSize = ScreenSize.MD;
    } else if (width >= 640) {
      screenSize = ScreenSize.SM;
    }

    setDeviceInfo(prevDeviceInfo => {
      if (screenSize === prevDeviceInfo.screenSize) {
        return prevDeviceInfo;
      }

      return { ...prevDeviceInfo, screenSize };
    });
  };

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor;
    const isMobile = typeof window.orientation !== 'undefined' || navigator.maxTouchPoints > 0;
    const isAndroid = /android/i.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    const isWindows = /windows/i.test(userAgent);
    const isLinux = /linux/i.test(userAgent);
    const isMac = /mac/i.test(userAgent);
    const isFirefox = /firefox/i.test(userAgent);

    setDeviceInfo({
      isMobile,
      isAndroid,
      isIOS,
      isWindows,
      isLinux,
      isMac,
      isFirefox,
      screenSize: ScreenSize.XS,
    });

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);

    return () => {
      window.removeEventListener('resize', updateScreenSize);
    };
  }, []);

  return deviceInfo;
};

export default useDeviceCheck;
