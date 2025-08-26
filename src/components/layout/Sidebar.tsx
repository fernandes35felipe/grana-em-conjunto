import { NavLink, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  TrendingUp, 
  ArrowUpDown, 
  Users, 
  PlusCircle,
  LogOut,
  DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Transações", href: "/transactions", icon: ArrowUpDown },
  { name: "Investimentos", href: "/investments", icon: TrendingUp },
  { name: "Grupos", href: "/groups", icon: Users },
  { name: "Novo Lançamento", href: "/new-transaction", icon: PlusCircle },
];

export const Sidebar = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  return (
    <div className="w-64 h-screen bg-card border-r border-border flex flex-col">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold text-foreground">FinanceAgent</h1>
        </div>
        {user && (
          <p className="text-sm text-muted-foreground">Olá, {user.name}</p>
        )}
      </div>
      
      <Separator />
      
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4">
        <Separator className="mb-4" />
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  );
};