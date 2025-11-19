import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

import type { RegisterSWOptions } from "virtual:pwa-register/react";

export const usePWA = () => {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | undefined>();

  const {
    offlineReady: pwaOfflineReady,
    needRefresh: pwaNeedRefresh,
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      setRegistration(r);
      console.log("SW Registered:", r);
    },
    onRegisterError(error) {
      console.error("SW registration error", error);
    },
  } as RegisterSWOptions);

  useEffect(() => {
    setOfflineReady(pwaOfflineReady);
  }, [pwaOfflineReady]);

  useEffect(() => {
    setNeedRefresh(pwaNeedRefresh);
  }, [pwaNeedRefresh]);

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  const updateApp = () => {
    updateServiceWorker(true);
  };

  return {
    needRefresh,
    offlineReady,
    registration,
    updateApp,
    close,
  };
};
