import { Outlet } from "react-router-dom";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { DashboardSidebar, MobileBottomNav } from "@/components/dashboard/sidebar";
import { KrishiBot } from "@/components/chatbot/krishibot";



function DashboardLayout() {
  return (
    <div className="min-h-dvh bg-background">
      <DashboardTopbar />
      <div className="mx-auto flex max-w-[1600px]">
        <DashboardSidebar />
        <main className="flex-1 pb-24 lg:pb-8">
          <Outlet />
        </main>
      </div>
      <MobileBottomNav />
      <KrishiBot />
    </div>
  );
}

export default DashboardLayout;
