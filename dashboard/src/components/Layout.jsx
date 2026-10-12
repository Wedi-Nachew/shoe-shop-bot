import { useEffect, useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import {
    LayoutDashboard,
    Package,
    PlusCircle,
    ShoppingBag,
    Footprints,
    ChevronLeft,
    ChevronRight,
    Menu,
    X,
} from "lucide-react";

const SIDEBAR_STATE_KEY = "dashboard.sidebar-collapsed";

const dashboardNav = [
    { to: "/", label: "Overview", icon: LayoutDashboard },
    { to: "/products", label: "Products", icon: Package },
    { to: "/orders", label: "Orders", icon: ShoppingBag },
];

const settingsNav = [
    { to: "/products/new", label: "Add Product", icon: PlusCircle },
];

function NavSection({ title, items, collapsed, onNavigate }) {
    return (
        <div>
            {!collapsed && (
                <p className="mb-2 px-4 text-11 font-semibold uppercase tracking-widest text-text-dim">
                    {title}
                </p>
            )}
            <div className="space-y-0.5">
                {items.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === "/"}
                            title={collapsed ? item.label : undefined}
                            onClick={onNavigate}
                            className={({ isActive }) =>
                                `group mx-2 flex rounded-xl text-13 font-medium transition-all duration-200 ${
                                    collapsed
                                        ? "justify-center px-0 py-2.5"
                                        : "items-center gap-3 px-4 py-2.5"
                                } ${
                                    isActive
                                        ? "bg-accent text-bg-body"
                                        : "text-text-secondary hover:bg-surface-muted hover:text-text-primary"
                                }`
                            }
                        >
                            <Icon className="h-4 w-4" />
                            {!collapsed && <span>{item.label}</span>}
                        </NavLink>
                    );
                })}
            </div>
        </div>
    );
}

export default function Layout() {
    const [isDesktop, setIsDesktop] = useState(() => {
        if (typeof window === "undefined") return true;
        return window.matchMedia("(min-width: 1024px)").matches;
    });
    const [collapsed, setCollapsed] = useState(() => {
        if (typeof window === "undefined") return false;
        return window.localStorage.getItem(SIDEBAR_STATE_KEY) === "1";
    });
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia("(min-width: 1024px)");
        const handleChange = (event) => {
            setIsDesktop(event.matches);
            if (event.matches) setMobileNavOpen(false);
        };
        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, []);

    useEffect(() => {
        window.localStorage.setItem(SIDEBAR_STATE_KEY, collapsed ? "1" : "0");
    }, [collapsed]);

    const navCollapsed = isDesktop && collapsed;
    const desktopSidebarWidthClass = navCollapsed ? "lg:w-18" : "lg:w-60";
    const mainOffsetClass = navCollapsed ? "lg:ml-18" : "lg:ml-60";
    const mobileSidebarTransform = mobileNavOpen
        ? "translate-x-0"
        : "-translate-x-full";

    return (
        <div className="flex min-h-screen bg-bg-body">
            {/* Mobile top bar */}
            <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-border-subtle bg-bg-sidebar px-4 lg:hidden">
                <button
                    type="button"
                    onClick={() => setMobileNavOpen((prev) => !prev)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-card bg-bg-card text-text-secondary transition-colors hover:text-text-primary"
                    aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
                >
                    {mobileNavOpen ? (
                        <X className="h-4 w-4" />
                    ) : (
                        <Menu className="h-4 w-4" />
                    )}
                </button>

                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent">
                        <Footprints className="h-4 w-4 text-bg-body" />
                    </div>
                    <h1 className="text-sm font-semibold text-text-primary">
                        Smart Shoe Store
                    </h1>
                </div>
            </div>

            {/* Mobile backdrop */}
            <div
                className={`fixed inset-0 z-20 bg-black/40 transition-opacity duration-300 lg:hidden ${
                    mobileNavOpen
                        ? "pointer-events-auto opacity-100"
                        : "pointer-events-none opacity-0"
                }`}
                onClick={() => setMobileNavOpen(false)}
                aria-hidden="true"
            />

            {/* ── Sidebar ── */}
            <aside
                className={`fixed inset-y-0 left-0 z-40 flex w-72 ${desktopSidebarWidthClass} ${mobileSidebarTransform} flex-col border-r border-border-subtle bg-bg-sidebar transition-all duration-300 lg:translate-x-0`}
            >
                <button
                    type="button"
                    onClick={() => setCollapsed((prev) => !prev)}
                    className="absolute -right-3 top-6 z-20 hidden h-7 w-7 items-center justify-center rounded-full border border-border-card bg-bg-card text-text-secondary shadow-lg transition-colors hover:text-text-primary lg:flex"
                    aria-label={
                        collapsed ? "Expand sidebar" : "Collapse sidebar"
                    }
                >
                    {collapsed ? (
                        <ChevronRight className="h-3.5 w-3.5" />
                    ) : (
                        <ChevronLeft className="h-3.5 w-3.5" />
                    )}
                </button>

                {/* Brand */}
                <div
                    className={`flex pb-4 pt-5 ${
                        navCollapsed
                            ? "justify-center px-2"
                            : "items-center gap-3 px-5"
                    }`}
                >
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent">
                        <Footprints className="h-5 w-5 text-bg-body" />
                    </div>
                    {!navCollapsed && (
                        <h1 className="text-15 font-bold leading-tight text-text-primary">
                            Smart Shoe Store
                        </h1>
                    )}
                </div>

                {/* Nav */}
                <nav className="flex-1 space-y-6 overflow-y-auto pt-4 lg:pt-5">
                    <NavSection
                        title="Dashboards"
                        items={dashboardNav}
                        collapsed={navCollapsed}
                        onNavigate={() => {
                            if (!isDesktop) setMobileNavOpen(false);
                        }}
                    />
                    <NavSection
                        title="Management"
                        items={settingsNav}
                        collapsed={navCollapsed}
                        onNavigate={() => {
                            if (!isDesktop) setMobileNavOpen(false);
                        }}
                    />
                </nav>

                {/* Bottom */}
                <div
                    className={`border-t border-border-subtle py-4 text-11 font-medium text-text-dim ${
                        navCollapsed ? "px-2 text-center" : "px-5"
                    }`}
                >
                    {navCollapsed ? "© 26" : "© 2026 Smart Shoe Store"}
                </div>
            </aside>

            {/* ── Main Content ── */}
            <main
                className={`min-w-0 w-full flex-1 ${mainOffsetClass} p-4 pt-14 transition-all duration-300 sm:p-6 sm:pt-14 lg:p-8 lg:pt-6`}
            >
                <Outlet />
            </main>
        </div>
    );
}
