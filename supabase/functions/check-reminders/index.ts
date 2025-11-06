import { createClient } from "https";
import * as webpush from "web-push";

// Tipos básicos (melhor seria compartilhar com o 'types.ts' do seu app, mas isto funciona)
interface Reminder {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  reminder_date: string;
}
interface Subscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Configurar o web-push com suas chaves VAPID
// IMPORTANTE: Use as mesmas chaves do seu .env (VITE_VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY)
// Você deve adicionar VAPID_PRIVATE_KEY nas 'secrets' do seu projeto Supabase
// supabase secrets set VAPID_PUBLIC_KEY=SUA_CHAVE_PUBLICA
// supabase secrets set VAPID_PRIVATE_KEY=SUA_CHAVE_PRIVADA
webpush.setVapidDetails(
  "mailto:seu-email@dominio.com", // Adicione seu email
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Tratar requisição OPTIONS (CORS)
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // Use a Service Role Key para rodar no servidor
    );

    const now = new Date().toISOString();

    // 1. Buscar lembretes pendentes
    const { data: reminders, error: remindersError } = await supabaseClient
      .from("reminders")
      .select("*")
      .eq("is_completed", false)
      .eq("is_notified", false)
      .lte("reminder_date", now);

    if (remindersError) throw remindersError;
    if (!reminders || reminders.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhum lembrete pendente." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const notificationsToSend: Promise<any>[] = [];
    const notifiedReminderIds: string[] = [];

    // 2. Para cada lembrete, buscar as inscrições (assinaturas) do usuário
    for (const reminder of reminders) {
      const { data: subscriptions, error: subsError } = await supabaseClient
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", reminder.user_id)
        .eq("is_active", true);

      if (subsError || !subscriptions) continue;

      for (const sub of subscriptions) {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        const payload = JSON.stringify({
          title: reminder.title,
          body: reminder.description || "Você tem um novo lembrete.",
          tag: `reminder-${reminder.id}`,
          data: {
            url: "/reminders", // Para onde o usuário vai ao clicar
          },
        });

        // 3. Adicionar o envio da notificação à fila
        notificationsToSend.push(
          webpush.sendNotification(pushSubscription, payload).catch(async (err) => {
            console.error(`Erro ao enviar notificação para ${sub.endpoint}: ${err.message}`);
            // Se a inscrição expirou (410 Gone), desativa ela no banco
            if (err.statusCode === 410) {
              await supabaseClient.from("push_subscriptions").update({ is_active: false }).eq("endpoint", sub.endpoint);
            }
          })
        );
      }
      notifiedReminderIds.push(reminder.id);
    }

    // 4. Enviar todas as notificações
    await Promise.all(notificationsToSend);

    // 5. Marcar lembretes como notificados
    if (notifiedReminderIds.length > 0) {
      await supabaseClient
        .from("reminders")
        .update({ is_notified: true, notification_sent_at: new Date().toISOString() })
        .in("id", notifiedReminderIds);
    }

    return new Response(JSON.stringify({ message: `${notificationsToSend.length} notificações enviadas.` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
