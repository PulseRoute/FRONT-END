import { Outlet } from "react-router-dom";
import Sidebar, { type UserRole } from "./Sidebar";

interface DashboardLayoutProps {
    role: UserRole;
    username?: string;
}

const DashboardLayout = ({ role, username = "User" }: DashboardLayoutProps) => {
    return (
        <div className="min-h-screen bg-[#f8f9fb]">
            {/* Sidebar */}
            <Sidebar role={role} />

            {/* Main Content */}
            <div className="ml-60">
                {/* Top Header */}
                <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-slate-100 flex items-center justify-end px-8 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center">
                            <span className="text-xs font-medium text-white">
                                {username.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <span className="text-sm font-medium text-slate-700">{username}</span>
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
