import { useState, useEffect } from "react";
import { api } from "../api/client";
import {
    ShoppingBag,
    Clock,
    CheckCircle2,
    Truck,
    PackageCheck,
    XCircle,
    ChevronDown,
    ChevronUp,
    User,
    Phone,
    MapPin,
} from "lucide-react";

const STATUS_OPTIONS = [
    { value: "", label: "All" },
    { value: "pending", label: "Pending" },
    { value: "confirmed", label: "Confirmed" },
    { value: "shipped", label: "Shipped" },
    { value: "delivered", label: "Delivered" },
    { value: "cancelled", label: "Cancelled" },
];

const STATUS_CONFIG = {
    pending: {
        text: "text-warning",
        badge: "border border-warning-border bg-warning-bg",
        iconBg: "bg-warning-bg",
        icon: Clock,
    },
    confirmed: {
        text: "text-success",
        badge: "border border-success-border bg-success-bg",
        iconBg: "bg-success-bg",
        icon: CheckCircle2,
    },
    shipped: {
        text: "text-info",
        badge: "border border-info-border bg-info-bg",
        iconBg: "bg-info-bg",
        icon: Truck,
    },
    delivered: {
        text: "text-text-secondary",
        badge: "border border-border-card bg-surface-muted",
        iconBg: "bg-surface-muted",
        icon: PackageCheck,
    },
    cancelled: {
        text: "text-error",
        badge: "border border-error-border bg-error-bg",
        iconBg: "bg-error-bg",
        icon: XCircle,
    },
};

const STATUS_TRANSITIONS = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: [],
    cancelled: [],
};

const ACTION_LABELS = {
    confirmed: { label: "Confirm", icon: CheckCircle2 },
    shipped: { label: "Ship", icon: Truck },
    delivered: { label: "Delivered", icon: PackageCheck },
    cancelled: { label: "Cancel", icon: XCircle },
};

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [statusCounts, setStatusCounts] = useState([]);
    const [filterStatus, setFilterStatus] = useState("");
    const [expandedOrder, setExpandedOrder] = useState(null);
    const [orderDetails, setOrderDetails] = useState({});
    const [loading, setLoading] = useState(true);

    const loadOrders = (status = "") => {
        setLoading(true);
        const params = status ? { status } : {};
        api.getOrders(params)
            .then((data) => {
                setOrders(data.orders);
                setStatusCounts(data.statusCounts);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        api.getOrders()
            .then((data) => {
                setOrders(data.orders);
                setStatusCounts(data.statusCounts);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleFilter = (status) => {
        setFilterStatus(status);
        loadOrders(status);
    };

    const toggleDetails = async (orderId) => {
        if (expandedOrder === orderId) {
            setExpandedOrder(null);
            return;
        }
        if (!orderDetails[orderId]) {
            try {
                const detail = await api.getOrder(orderId);
                setOrderDetails((prev) => ({ ...prev, [orderId]: detail }));
            } catch (err) {
                console.error(err);
            }
        }
        setExpandedOrder(orderId);
    };

    const handleStatusChange = async (orderId, newStatus) => {
        const action =
            newStatus === "cancelled" ? "cancel" : `mark as ${newStatus}`;
        if (!confirm(`Are you sure you want to ${action} order #${orderId}?`))
            return;
        try {
            await api.updateOrderStatus(orderId, newStatus);
            loadOrders(filterStatus);
            if (expandedOrder === orderId) {
                const detail = await api.getOrder(orderId);
                setOrderDetails((prev) => ({ ...prev, [orderId]: detail }));
            }
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div className="space-y-6">
            {/* ── Sticky header ── */}
            <div className="sticky top-14 z-20 space-y-4 border-b border-border-subtle bg-bg-body pb-4 pt-4 lg:top-0">
                <div className="animate-in">
                    <div className="mb-1 flex items-center gap-2 text-13 text-text-dim">
                        <span>Dashboards</span>
                        <span>/</span>
                        <span className="text-text-primary">Orders</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-text-primary">
                        Orders
                    </h1>
                </div>

                {/* Filter tabs */}
                <div
                    className="animate-in delay-1"
                    style={{
                        overflowX: "auto",
                        WebkitOverflowScrolling: "touch",
                        scrollbarWidth: "none",
                        msOverflowStyle: "none",
                    }}
                >
                    <div
                        className="flex gap-2 pb-1"
                        style={{ width: "max-content" }}
                    >
                        {STATUS_OPTIONS.map((opt) => {
                            const count = opt.value
                                ? statusCounts.find(
                                      (s) => s.status === opt.value,
                                  )?.count || 0
                                : orders.length;
                            const isActive = filterStatus === opt.value;
                            return (
                                <button
                                    key={opt.value}
                                    onClick={() => handleFilter(opt.value)}
                                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-13 font-medium transition-all duration-200 ${
                                        isActive
                                            ? "bg-accent text-bg-body"
                                            : "border border-border-card bg-bg-card text-text-secondary hover:text-text-primary"
                                    }`}
                                >
                                    {opt.label}
                                    <span
                                        className={`text-11 px-1.5 py-0.5 rounded-full font-semibold ${isActive ? "bg-black/15 text-bg-body" : "bg-surface-strong text-text-dim"}`}
                                    >
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Body ── */}
            {loading ? (
                <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="skeleton h-16 rounded-xl" />
                    ))}
                </div>
            ) : orders.length === 0 ? (
                <div className="text-center py-16">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-muted">
                        <ShoppingBag className="h-8 w-8 text-text-dim" />
                    </div>
                    <p className="text-sm text-text-secondary">
                        No orders found.
                    </p>
                </div>
            ) : (
                <div className="space-y-2 animate-in delay-2">
                    {orders.map((order) => {
                        const cfg =
                            STATUS_CONFIG[order.status] ||
                            STATUS_CONFIG.pending;
                        const isExpanded = expandedOrder === order.id;
                        const StatusIcon = cfg.icon;
                        const detail = orderDetails[order.id];

                        return (
                            <div
                                key={order.id}
                                className="dark-card overflow-hidden"
                            >
                                {/* ── Card row — mirrors product card layout ── */}
                                <div
                                    className="flex cursor-pointer items-center gap-3 p-3.5 transition-colors hover:bg-surface-veil"
                                    onClick={() => toggleDetails(order.id)}
                                >
                                    {/* Status icon "thumbnail" */}
                                    <div
                                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${cfg.iconBg}`}
                                    >
                                        <StatusIcon
                                            className={`h-6 w-6 ${cfg.text}`}
                                        />
                                    </div>

                                    {/* Info block */}
                                    <div className="flex-1 min-w-0">
                                        {/* Top row: order id + customer name | total */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                                <p className="font-semibold text-text-primary text-13 truncate leading-tight">
                                                    Order #{order.id}
                                                </p>
                                                <p className="text-11 text-text-dim truncate">
                                                    {order.user_name ||
                                                        "Unknown"}
                                                </p>
                                            </div>
                                            <p className="shrink-0 font-semibold text-13 text-text-primary whitespace-nowrap">
                                                {Number(
                                                    order.total,
                                                ).toLocaleString()}{" "}
                                                <span className="text-11 font-normal text-text-dim">
                                                    ETB
                                                </span>
                                            </p>
                                        </div>

                                        {/* Bottom row: badge + item count | chevron */}
                                        <div className="mt-2 flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5">
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-11 font-semibold ${cfg.badge} ${cfg.text}`}
                                                >
                                                    <span
                                                        className={`h-1.5 w-1.5 rounded-full ${cfg.text.replace("text-", "bg-")}`}
                                                    />
                                                    {order.status}
                                                </span>
                                                <span className="text-11 text-text-dim">
                                                    · {order.item_count} item
                                                    {order.item_count !== 1
                                                        ? "s"
                                                        : ""}
                                                </span>
                                            </div>
                                            {isExpanded ? (
                                                <ChevronUp className="h-4 w-4 shrink-0 text-text-dim" />
                                            ) : (
                                                <ChevronDown className="h-4 w-4 shrink-0 text-text-dim" />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* ── Expanded panel ── */}
                                {isExpanded && detail && (
                                    <div className="border-t border-border-subtle bg-surface-01 p-4 space-y-4">
                                        {/* Customer info */}
                                        <div className="space-y-3">
                                            {[
                                                {
                                                    Icon: User,
                                                    label: "Customer",
                                                    value:
                                                        detail.user_name +
                                                        (detail.user_username
                                                            ? ` @${detail.user_username}`
                                                            : ""),
                                                },
                                                {
                                                    Icon: Phone,
                                                    label: "Phone",
                                                    value:
                                                        detail.user_phone ||
                                                        "N/A",
                                                },
                                                {
                                                    Icon: MapPin,
                                                    label: "Address",
                                                    value:
                                                        detail.delivery_address ||
                                                        "N/A",
                                                },
                                            ].map(({ Icon, label, value }) => (
                                                <div
                                                    key={label}
                                                    className="flex items-start gap-2"
                                                >
                                                    <Icon className="h-4 w-4 shrink-0 text-text-dim mt-0.5" />
                                                    <div className="min-w-0">
                                                        <p className="text-11 text-text-dim">
                                                            {label}
                                                        </p>
                                                        <p className="text-13 font-medium text-text-primary break-words">
                                                            {value}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Items */}
                                        <div>
                                            <h4 className="mb-2 text-11 font-semibold uppercase tracking-wider text-text-dim">
                                                Items
                                            </h4>
                                            <div className="space-y-1.5">
                                                {detail.items?.map(
                                                    (item, i) => (
                                                        <div
                                                            key={i}
                                                            className="rounded-xl border border-border-subtle bg-bg-card px-4 py-2.5"
                                                        >
                                                            <p className="text-13 text-text-secondary break-words">
                                                                {
                                                                    item.product_name
                                                                }
                                                                {item.product_colorway &&
                                                                    ` — ${item.product_colorway}`}{" "}
                                                                <span className="text-text-dim">
                                                                    (Size{" "}
                                                                    {item.size})
                                                                    ×{" "}
                                                                    {
                                                                        item.quantity
                                                                    }
                                                                </span>
                                                            </p>
                                                            <p className="mt-0.5 text-13 font-semibold text-text-primary">
                                                                {Number(
                                                                    item.price_at_order *
                                                                        item.quantity,
                                                                ).toLocaleString()}{" "}
                                                                ETB
                                                            </p>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        </div>

                                        {/* Status actions */}
                                        {STATUS_TRANSITIONS[order.status]
                                            ?.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {STATUS_TRANSITIONS[
                                                    order.status
                                                ].map((nextStatus) => {
                                                    const act =
                                                        ACTION_LABELS[
                                                            nextStatus
                                                        ];
                                                    const ActIcon = act.icon;
                                                    const isCancel =
                                                        nextStatus ===
                                                        "cancelled";
                                                    return (
                                                        <button
                                                            key={nextStatus}
                                                            onClick={() =>
                                                                handleStatusChange(
                                                                    order.id,
                                                                    nextStatus,
                                                                )
                                                            }
                                                            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-12 font-semibold transition-all duration-200 ${
                                                                isCancel
                                                                    ? "border border-error-border bg-error-soft text-error hover:bg-error-bg"
                                                                    : "btn-accent px-4 py-2 text-12"
                                                            }`}
                                                        >
                                                            <ActIcon className="w-3.5 h-3.5" />
                                                            {act.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Orders;
