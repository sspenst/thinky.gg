import { useEffect, useState } from 'react';

interface CustomWindow extends Window {
  MSStream: any;
}

declare let window: CustomWindow;

type DeviceInfo = {
  isMobile: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  isWindows: boolean;
  isLinux: boolean;
  isMac: boolean;
  screen: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
};

const useDeviceCheck = (): DeviceInfo => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isAndroid: false,
    isIOS: false,
    isWindows: false,
    isLinux: false,
    isMac: false,
    screen: 'md',
  });

  const updateScreenSize = () => {
    const width = window.innerWidth;
    let screen: 'xs' | 'sm' | 'md' | 'lg' | 'xl' = 'md';

    if (width < 576) {
      screen = 'xs';
    } else if (width >= 576 && width < 768) {
      screen = 'sm';
    } else if (width >= 768 && width < 992) {
      screen = 'md';
    } else if (width >= 992 && width < 1200) {
      screen = 'lg';
    } else if (width >= 1200) {
      screen = 'xl';
    }

    setDeviceInfo(prevState => ({ ...prevState, screen }));
  };

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor;

    const isMobile = typeof window.orientation !== 'undefined' || navigator.maxTouchPoints > 0;
    const isAndroid = /android/i.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
    const isWindows = /windows/i.test(userAgent);
    const isLinux = /linux/i.test(userAgent);
    const isMac = /mac/i.test(userAgent);

    setDeviceInfo({
      isMobile,
      isAndroid,
      isIOS,
      isWindows,
      isLinux,
      isMac,
      screen: 'md',
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
