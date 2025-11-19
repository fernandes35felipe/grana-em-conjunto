import { supabase } from "@/integrations/supabase/client";

import type { PushSubscription } from "@/utils/types/reminder.types";
const PUBLIC_VAPID_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY || "BETwmgmXXkeAecI8eHXj-kCKkj_0c-qDX3znwN4oCgQUn2QAblyPI3E1Sc3xLgurcNnz12-K8AuUYyTyQLIFXT4";

export class PushNotificationService {
  private static instance: PushNotificationService;
  private registration: ServiceWorkerRegistration | null = null;

  private constructor() {}

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  async initialize(): Promise<boolean> {
    if (!("serviceWorker" in navigator)) {
      console.warn("Service Workers não suportados neste navegador");
      return false;
    }

    if (!("PushManager" in window)) {
      console.warn("Push API não suportada neste navegador");
      return false;
    }

    try {
      this.registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      console.log("Service Worker registrado com sucesso");
      return true;
    } catch (error) {
      console.error("Erro ao registrar Service Worker:", error);
      return false;
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!("Notification" in window)) {
      throw new Error("Notificações não suportadas");
    }

    const permission = await Notification.requestPermission();
    console.log("Permissão de notificação:", permission);
    return permission;
  }

  async getPermissionState(): Promise<NotificationPermission> {
    if (!("Notification" in window)) {
      return "denied";
    }
    return Notification.permission;
  }

  async subscribe(userId: string): Promise<PushSubscription | null> {
    if (!this.registration) {
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error("Falha ao inicializar Service Worker");
      }
    }

    if (!this.registration) {
      throw new Error("Service Worker não registrado");
    }

    const permission = await this.requestPermission();
    if (permission !== "granted") {
      throw new Error("Permissão de notificação negada");
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
      });
      const subscriptionData = {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: this.arrayBufferToBase64(subscription.getKey("p256dh")),
        auth: this.arrayBufferToBase64(subscription.getKey("auth")),
        user_agent: navigator.userAgent,
        is_active: true,
      };
      const { data, error } = await supabase
        .from("push_subscriptions" as any)
        .upsert(subscriptionData, { onConflict: "endpoint" })
        .select()
        .single();
      if (error) throw error;

      console.log("Inscrição push criada com sucesso");

      await this.showNotification("Notificações Ativadas!", {
        body: "Você receberá lembretes mesmo quando não estiver usando o aplicativo.",
        icon: "/icons/icon-192x192.png",
        badge: "/icons/badge-96x96.png",
      });
      return data;
    } catch (error) {
      console.error("Erro ao criar inscrição push:", error);
      throw error;
    }
  }

  async unsubscribe(userId: string): Promise<void> {
    if (!this.registration) {
      return;
    }

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }

      await supabase.from("push_subscriptions").delete().eq("user_id", userId);

      console.log("Inscrição push cancelada");
    } catch (error) {
      console.error("Erro ao cancelar inscrição push:", error);
      throw error;
    }
  }

  async isSubscribed(): Promise<boolean> {
    if (!this.registration) {
      await this.initialize();
    }

    if (!this.registration) {
      return false;
    }

    const subscription = await this.registration.pushManager.getSubscription();
    return subscription !== null;
  }

  async showNotification(title: string, options?: NotificationOptions): Promise<void> {
    const permission = await this.getPermissionState();
    if (permission !== "granted") {
      console.warn("Permissão de notificação não concedida");
      return;
    }

    if (!this.registration) {
      console.warn("Service Worker registration not found. Initializing...");
      await this.initialize();
      if (!this.registration) {
        console.error("Falha ao encontrar o registration do Service Worker. Usando fallback.");
        try {
          new Notification(title, {
            icon: "/icons/icon-192x192.png",
            badge: "/icons/badge-96x96.png",
            ...options,
          });
          console.log("Notificação exibida (fallback):", title);
        } catch (e) {
          console.error("Erro ao exibir notificação de fallback:", e);
        }
        return;
      }
    }

    try {
      this.registration.active?.postMessage({
        type: "show-notification",
        title: title,
        options: {
          badge: "/icons/badge-96x96.png",
          icon: "/icons/icon-192x192.png",
          vibrate: [200, 100, 200],
          requireInteraction: false,
          ...options,
        },
      });
      console.log("Mensagem de notificação enviada ao Service Worker:", title);
    } catch (error) {
      console.error("Erro ao enviar mensagem para o Service Worker:", error);
      try {
        new Notification(title, {
          icon: "/icons/icon-192x192.png",
          badge: "/icons/badge-96x96.png",
          ...options,
        });
        console.log("Notificação exibida (fallback 2):", title);
      } catch (e) {
        console.error("Erro ao exibir notificação de fallback 2:", e);
      }
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    // <-- MUDE O TIPO DE RETORNO PARA Uint8Array
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, "+").replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer | null): string {
    if (!buffer) return "";
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }
}

export const pushNotificationService = PushNotificationService.getInstance();
