import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
    Activity,
    Users,
    MessageSquare,
    LogOut,
    Settings,
    Ambulance,
    ClipboardPlus,
    Clock,
    History,
} from "lucide-react";

export type UserRole = "ems" | "hospital";

interface SidebarProps {
    role: UserRole;
}

const emsMenuItems = [
    { label: "Dispatch", href: "/ems/dispatch", icon: ClipboardPlus },
    { label: "Active Cases", href: "/ems/active", icon: Clock },
    { label: "History", href: "/ems/history", icon: History },
    { label: "Chatting", href: "/ems/chat", icon: MessageSquare },
];

const hospitalMenuItems = [
    { label: "Dashboard", href: "/hospital/dashboard", icon: Activity },
    { label: "Incoming Patients", href: "/hospital/incoming", icon: Ambulance },
    { label: "Chatting", href: "/hospital/chat", icon: MessageSquare },
    { label: "Bed Management", href: "/hospital/beds", icon: Users },
];

const Sidebar = ({ role }: SidebarProps) => {
    const location = useLocation();
    const menuItems = role === "ems" ? emsMenuItems : hospitalMenuItems;

    return (
        <aside className="w-60 h-screen bg-white flex flex-col fixed left-0 top-0 border-r border-slate-100">
            {/* Logo */}
            <div className="h-16 flex items-center px-6">
                <Link to="/" className="text-lg font-semibold text-slate-900 tracking-tight">
                    PulseRoute
                </Link>
            </div>

            {/* Main Menu */}
            <nav className="flex-1 px-3 py-2">
                <ul className="space-y-0.5">
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.href;
                        const Icon = item.icon;

                        return (
                            <li key={item.href}>
                                <Link
                                    to={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all duration-200",
                                        isActive
                                            ? "bg-slate-900 text-white"
                                            : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                    )}
                                >
                                    <Icon className={cn("size-[18px]", isActive ? "text-white" : "text-slate-400")} />
                                    {item.label}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>

            {/* Support Section */}
            <div className="px-3 py-4 border-t border-slate-100">
                <ul className="space-y-0.5">
                    <li>
                        <Link
                            to="/settings"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all duration-200"
                        >
                            <Settings className="size-[18px] text-slate-400" />
                            Settings
                        </Link>
                    </li>
                    <li>
                        <Link
                            to="/"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium text-red-500 hover:bg-red-50 transition-all duration-200"
                        >
                            <LogOut className="size-[18px]" />
                            Logout
                        </Link>
                    </li>
                </ul>
            </div>
        </aside>
    );
};

export default Sidebar;
