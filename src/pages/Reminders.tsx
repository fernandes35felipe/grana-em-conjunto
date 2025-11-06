import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RemindersList } from "@/components/reminders/RemindersList";

const Reminders = () => {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Lembretes</h1>
          <p className="text-muted-foreground mt-2">Gerencie seus lembretes e notificações financeiras</p>
        </div>

        <RemindersList />
      </div>
    </DashboardLayout>
  );
};

export default Reminders;
