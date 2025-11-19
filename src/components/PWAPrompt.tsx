import { useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { RefreshCw, X } from "lucide-react";

import { usePWA } from "../hooks/usePWA";

import type { FC } from "react";

const PWAPrompt: FC = () => {
  const { needRefresh, offlineReady, updateApp, close } = usePWA();

  useEffect(() => {
    if (offlineReady) {
      console.log("App pronta para funcionar offline");
    }
  }, [offlineReady]);

  if (!needRefresh && !offlineReady) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <Card className="border-primary">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{needRefresh ? "Atualização Disponível" : "App Pronto"}</CardTitle>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={close}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            {needRefresh ? "Uma nova versão do app está disponível" : "O app está pronto para funcionar offline"}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {needRefresh && (
            <Button onClick={updateApp} className="w-full" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Atualizar Agora
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PWAPrompt;
