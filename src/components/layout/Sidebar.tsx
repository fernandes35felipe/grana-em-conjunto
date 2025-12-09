import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, ArrowUpDown, TrendingUp, Users, PlusCircle, DollarSign, LogOut, Bell, User, Tag, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { useAuth } from "@/contexts/AuthContext";

interface SidebarProps {
  onNavigate?: () => void;
}

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Transações", href: "/transactions", icon: ArrowUpDown },
  { name: "Investimentos", href: "/investments", icon: TrendingUp },
  { name: "Grupos", href: "/groups", icon: Users },
  { name: "Categorias", href: "/tags", icon: Tag },
  { name: "Relatórios", href: "/reports", icon: FileText },
  { name: "Lembretes", href: "/reminders", icon: Bell },
  { name: "Meu Perfil", href: "/profile", icon: User },
  { name: "Novo Lançamento", href: "/new-transaction", icon: PlusCircle },
];

export const Sidebar = ({ onNavigate }: SidebarProps) => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleNavClick = () => {
    if (onNavigate) {
      onNavigate();
    }
  };

  return (
    <div className="flex h-full w-full flex-col bg-card border-r border-border">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="h-8 w-8 text-primary" />
          <h1 className="text-xl font-bold text-foreground">Zeni Wallet</h1>
        </div>
        {user && <p className="text-sm text-muted-foreground truncate">Olá, {user.email}</p>}
      </div>

      <Separator />

      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {navigation.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            onClick={handleNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <Separator />

      <div className="p-4">
        <Button variant="ghost" className="w-full justify-start gap-3" onClick={handleLogout}>
          <LogOut className="h-5 w-5" />
          <span>Sair</span>
        </Button>
      </div>
    </div>
  );
};
