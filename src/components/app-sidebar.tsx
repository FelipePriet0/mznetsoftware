import { type CSSProperties } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  ChevronRight,
  History,
  KanbanSquare,
  Route,
  User,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

type NavItem = {
  title: string;
  url: string;
  icon: LucideIcon;
  end?: boolean;
};

const sidebarDimensions: CSSProperties = {
  "--sidebar-width": "14rem",
  "--sidebar-width-icon": "5.5rem",
};

const navigationItems: NavItem[] = [
  { title: "Kanban", url: "/", icon: KanbanSquare, end: true },
  { title: "Agendamento", url: "/agendamento", icon: Route },
  { title: "Histórico", url: "/historico", icon: History },
  { title: "Perfil", url: "/perfil", icon: User },
];

const utilityItems: NavItem[] = [];

export function AppSidebar() {
  const location = useLocation();
  const currentPath = location.pathname;

  const renderItem = (item: NavItem) => {
    const active = item.end ? currentPath === item.url : currentPath.startsWith(item.url);

    return (
      <SidebarMenuItem key={item.title} className="w-full">
        <SidebarMenuButton
          asChild
          isActive={active}
          tooltip={item.title}
          className={cn(
            "relative flex h-12 w-full items-center gap-3 rounded-full border border-[var(--overlay-white-25)]",
            "bg-[var(--overlay-white-12)] px-4 text-[color:var(--overlay-white-90)] transition-all duration-200 backdrop-blur-md",
            "hover:border-[var(--overlay-white-55)] hover:bg-[var(--overlay-white-35)] hover:text-[hsl(var(--neutral-white))]",
            "focus-visible:ring-2 focus-visible:ring-[var(--overlay-white-55)] focus-visible:ring-offset-0",
            "data-[active=true]:border-[var(--overlay-white-90)] data-[active=true]:bg-[var(--overlay-white-35)]",
            "data-[active=true]:text-[hsl(var(--neutral-white))] data-[active=true]:shadow-[0_12px_32px_hsl(var(--brand)/0.38)]",
            "after:absolute after:right-[-14px] after:h-10 after:w-1.5 after:rounded-full after:bg-[hsl(var(--neutral-white))] after:opacity-0 after:transition-opacity",
            "data-[active=true]:after:opacity-100",
            "group-data-[collapsible=icon]:!w-12 group-data-[collapsible=icon]:!px-0 group-data-[collapsible=icon]:justify-center",
            "group-data-[collapsible=icon]:rounded-3xl group-data-[collapsible=icon]:border-[var(--overlay-white-25)]",
            "group-data-[collapsible=icon]:bg-[var(--overlay-white-12)] group-data-[collapsible=icon]:shadow-none group-data-[collapsible=icon]:after:hidden"
          )}
        >
          <NavLink
            to={item.url}
            end={item.end}
            aria-label={item.title}
            className="flex h-full w-full items-center justify-start gap-3 transition-colors group-data-[collapsible=icon]:justify-center"
          >
            <item.icon className="h-5 w-5" aria-hidden="true" />
            <span className="text-sm font-medium tracking-wide text-[color:var(--overlay-white-92)] group-data-[collapsible=icon]:hidden">
              {item.title}
            </span>
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar
      collapsible="none"
      variant="sidebar"
      style={sidebarDimensions}
      className={cn(
        // Verde sólido diretamente no container quando collapsible="none"
        "bg-[hsl(var(--brand))] text-white",
        // E fallback para variantes que usam o wrapper interno
        "[&_[data-sidebar=sidebar]]:bg-[hsl(var(--brand))]",
        "[&_[data-sidebar=sidebar]]:text-[hsl(var(--neutral-white))]",
        "[&_[data-sidebar=content]]:px-0"
      )}
    >
      {/* Toggle button removido: sidebar permanece sempre aberta */}

      <SidebarContent className="flex h-full flex-col items-center justify-between gap-0 px-0 py-6">
        <div className="flex flex-col items-center gap-8">
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-3xl border border-[var(--overlay-white-35)] bg-[var(--overlay-white-12)] text-base font-bold uppercase tracking-[0.3em] text-[color:var(--overlay-white-92)]">
              MZ
            </div>
            <span className="text-[0.65rem] uppercase tracking-[0.5em] text-[color:var(--overlay-white-60)] group-data-[state=collapsed]:hidden">
              Net
            </span>
          </div>

          <SidebarGroup className="w-full p-0">
            <SidebarGroupContent className="flex w-full justify-center">
              <SidebarMenu className="flex w-full flex-col items-center gap-5">
                {navigationItems.map(renderItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>

        {utilityItems.length > 0 && (
          <SidebarGroup className="w-full p-0">
            <SidebarGroupContent className="flex w-full justify-center">
              <SidebarMenu className="flex w-full flex-col items-center gap-5">
                {utilityItems.map(renderItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

export default AppSidebar;
