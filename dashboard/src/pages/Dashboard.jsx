import { useState, useEffect, useRef } from "react";
import { api } from "../api/client";
import StatsCards from "../components/StatsCards";
import {
    AlertTriangle,
    Flame,
    TrendingUp,
    BarChart3,
    Calendar,
    ChevronDown,
} from "lucide-react";

const periodOptions = [
    { label: "Today", days: 1, shortLabel: "Today" },
    { label: "7 days", days: 7, shortLabel: "7d" },
    { label: "30 days", days: 30, shortLabel: "30d" },
    { label: "90 days", days: 90, shortLabel: "90d" },
];

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState(periodOptions[0]);
    const [periodMenuOpen, setPeriodMenuOpen] = useState(false);
    const periodMenuRef = useRef(null);

    useEffect(() => {
        api.getStats(period.days)
            .then(setStats)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [period.days]);

    useEffect(() => {
        if (!periodMenuOpen) return;

        const handleOutsideClick = (event) => {
            if (
                periodMenuRef.current &&
                !periodMenuRef.current.contains(event.target)
            ) {
                setPeriodMenuOpen(false);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
        };
    }, [periodMenuOpen]);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="skeleton h-8 w-48" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="skeleton h-30 rounded-2xl" />
                    ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2 skeleton h-80 rounded-2xl" />
                    <div className="skeleton h-80 rounded-2xl" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="skeleton h-80 rounded-2xl" />
                    <div className="skeleton h-80 rounded-2xl" />
                </div>
            </div>
        );
    }

    const maxRevenue = stats?.dailyRevenue?.length
        ? Math.max(...stats.dailyRevenue.map((d) => Number(d.revenue)))
        : 0;

    const totalRevenue =
        stats?.dailyRevenue?.reduce((sum, d) => sum + Number(d.revenue), 0) ||
        0;

    const periodShortLabel = period.shortLabel || `${period.days}d`;
    const periodLongLabel =
        period.days === 1 ? "today" : `last ${period.days} days`;
    const dailyRevenueLabel =
        period.days === 1 ? "Today" : `${period.days} Days`;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="sticky top-14 z-20 border-b border-border-subtle bg-bg-body pb-4 pt-4 lg:top-0">
                <div className="flex flex-wrap items-center justify-between gap-3 animate-in">
                    <div>
                        <div className="mb-1 flex items-center gap-2 text-13 text-text-dim">
                            <span>Dashboards</span>
                            <span>/</span>
                            <span className="text-text-primary">Overview</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
                            Overview
                        </h1>
                    </div>
                    <div className="relative" ref={periodMenuRef}>
                        <button
                            type="button"
                            onClick={() => setPeriodMenuOpen((open) => !open)}
                            aria-expanded={periodMenuOpen}
                            className="inline-flex items-center gap-2 rounded-lg border border-border-card bg-bg-card px-3 py-2 text-13 font-medium text-text-secondary transition-colors hover:text-text-primary"
                        >
                            <Calendar className="w-4 h-4" />
                            {period.label}
                            <ChevronDown
                                className={`w-3 h-3 transition-transform ${
                                    periodMenuOpen ? "rotate-180" : ""
                                }`}
                            />
                        </button>
                        {periodMenuOpen && (
                            <div className="absolute right-0 z-30 mt-2 w-40 overflow-hidden rounded-xl border border-border-card bg-bg-card shadow-lg">
                                {periodOptions.map((option) => (
                                    <button
                                        key={option.days}
                                        type="button"
                                        onClick={() => {
                                            if (option.days !== period.days) {
                                                setLoading(true);
                                                setPeriod(option);
                                            }
                                            setPeriodMenuOpen(false);
                                        }}
                                        className={`w-full px-3 py-2 text-left text-13 transition-colors ${
                                            option.days === period.days
                                                ? "bg-surface-muted text-text-primary"
                                                : "text-text-secondary hover:bg-surface-veil hover:text-text-primary"
                                        }`}
                                    >
                                        {option.days === 1
                                            ? "Today (1d)"
                                            : option.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats row */}
            <StatsCards stats={stats} periodShortLabel={periodShortLabel} />

            {/* Main grid: Sales overview + Revenue chart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Sales overview — donut-like area */}
                <div className="lg:col-span-2 dark-card p-5 animate-in delay-2">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="flex items-center gap-2 text-15 font-semibold text-text-primary">
                            <BarChart3 className="h-4 w-4 text-accent" />
                            Daily Revenue ({dailyRevenueLabel})
                        </h2>
                        <span className="text-xs text-text-dim">
                            Total: {totalRevenue.toLocaleString()} ETB
                        </span>
                    </div>

                    <div className="space-y-3">
                        {stats?.dailyRevenue?.map((day) => {
                            const pct =
                                maxRevenue > 0
                                    ? (Number(day.revenue) / maxRevenue) * 100
                                    : 0;
                            return (
                                <div key={day.date} className="group">
                                    <div className="flex items-center justify-between text-13 mb-1.5">
                                        <span className="font-medium text-text-secondary">
                                            {day.date}
                                        </span>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-text-dim">
                                                {day.order_count} orders
                                            </span>
                                            <span className="font-bold text-text-primary">
                                                {Number(
                                                    day.revenue,
                                                ).toLocaleString()}{" "}
                                                ETB
                                            </span>
                                        </div>
                                    </div>
                                    <div className="h-3 overflow-hidden rounded-full bg-surface-muted">
                                        <div
                                            className="h-full rounded-full bg-linear-to-r from-accent-dim to-accent transition-all duration-700 ease-out"
                                            style={{
                                                width: `${Math.max(pct, 3)}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Right column: quick stats */}
                <div className="space-y-4">
                    {/* Top products */}
                    {stats?.topProducts?.length > 0 && (
                        <div className="dark-card p-5 animate-in delay-3">
                            <h2 className="mb-4 flex items-center gap-2 text-15 font-semibold text-text-primary">
                                <Flame className="h-4 w-4 text-orange-400" />
                                Top Sellers
                            </h2>
                            <div className="space-y-3">
                                {stats.topProducts
                                    .slice(0, 4)
                                    .map((item, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-3"
                                        >
                                            <span
                                                className={`flex h-6 w-6 items-center justify-center rounded-md text-11 font-bold ${
                                                    i === 0
                                                        ? "bg-accent-bg text-accent"
                                                        : "bg-surface-muted text-text-dim"
                                                }`}
                                            >
                                                {i + 1}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="truncate text-13 font-medium text-text-primary">
                                                    {item.product_name}
                                                </p>
                                                <p className="text-11 text-text-dim">
                                                    {item.total_sold} sold
                                                </p>
                                            </div>
                                            <span className="text-13 font-semibold text-accent">
                                                {Number(
                                                    item.total_revenue,
                                                ).toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom row: Low stock + revenue mini */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Low stock alerts */}
                {stats?.lowStock?.length > 0 && (
                    <div className="dark-card p-5 animate-in delay-4">
                        <h2 className="mb-4 flex items-center gap-2 text-15 font-semibold text-text-primary">
                            <AlertTriangle className="h-4 w-4 text-warning" />
                            Low Stock Alert
                        </h2>
                        <div className="space-y-2">
                            {stats.lowStock.slice(0, 5).map((item, i) => (
                                <div
                                    key={i}
                                    className="flex flex-col gap-2 border-b border-border-subtle py-2 text-13 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div>
                                        <span className="font-medium text-text-primary">
                                            {item.brand_name} {item.name}
                                        </span>
                                        {item.colorway && (
                                            <span className="ml-1 text-text-dim">
                                                — {item.colorway}
                                            </span>
                                        )}
                                        <span className="ml-1 text-text-dim">
                                            (Size {item.size})
                                        </span>
                                    </div>
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-bg px-2 py-0.5 text-xs font-bold text-warning">
                                        <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-warning" />
                                        {item.in_stock} left
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Revenue summary card */}
                <div className="dark-card p-5 animate-in delay-5">
                    <h2 className="mb-4 flex items-center gap-2 text-15 font-semibold text-text-primary">
                        <TrendingUp className="h-4 w-4 text-accent" />
                        Revenue Summary
                    </h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="rounded-xl bg-surface-soft p-4">
                            <p className="mb-1 text-xs text-text-dim">
                                Total Revenue
                            </p>
                            <p className="text-xl font-bold text-text-primary">
                                {Number(
                                    stats?.sales?.total_revenue || 0,
                                ).toLocaleString()}
                            </p>
                            <p className="text-11 text-text-dim">
                                ETB ({periodLongLabel})
                            </p>
                        </div>
                        <div className="rounded-xl bg-surface-soft p-4">
                            <p className="mb-1 text-xs text-text-dim">
                                Total Orders
                            </p>
                            <p className="text-xl font-bold text-accent">
                                {stats?.sales?.total_orders || 0}
                            </p>
                            <p className="text-11 text-text-dim">
                                {periodLongLabel}
                            </p>
                        </div>
                        <div className="rounded-xl bg-surface-soft p-4">
                            <p className="mb-1 text-xs text-text-dim">
                                Pending
                            </p>
                            <p className="text-xl font-bold text-warning">
                                {stats?.sales?.pending || 0}
                            </p>
                            <p className="text-11 text-text-dim">
                                awaiting action
                            </p>
                        </div>
                        <div className="rounded-xl bg-surface-soft p-4">
                            <p className="mb-1 text-xs text-text-dim">
                                Active Products
                            </p>
                            <p className="text-xl font-bold text-text-primary">
                                {stats?.inventory?.active_products || 0}
                            </p>
                            <p className="text-11 text-text-dim">listed</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
