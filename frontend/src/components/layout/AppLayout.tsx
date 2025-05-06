
import { Sidebar } from "./Sidebar";
import { NavBar } from "./NavBar";
import { Outlet } from "react-router-dom";

export function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <NavBar />
        <main className="flex-1 overflow-auto">
          <div className="container py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
