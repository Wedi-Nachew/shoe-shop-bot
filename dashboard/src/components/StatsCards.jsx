import {
    DollarSign,
    ShoppingBag,
    Package,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
} from "lucide-react";

const StatsCards = ({ stats, periodShortLabel = "30d" }) => {
    if (!stats) return null;

    const { sales, inventory, stockLevels } = stats;

    const cards = [
        {
            label: "Net Revenue",
            value: `${Number(sales.total_revenue).toLocaleString()} ETB`,
            change: "+12%",
            positive: true,
            sub: "vs previous period",
            icon: DollarSign,
        },
        {
            label: `Orders (${periodShortLabel})`,
            value: sales.total_orders.toLocaleString(),
            change: `${sales.pending} pending`,
            positive: sales.pending === 0,
            sub: "total orders",
            icon: ShoppingBag,
        },
        {
            label: "Avg Order Value",
            value: `${Math.round(sales.avg_order_value).toLocaleString()} ETB`,
            change: null,
            sub: "per order",
            icon: TrendingUp,
        },
        {
            label: "Total Units",
            value: stockLevels.total_units.toLocaleString(),
            change: `${inventory.active_products} products`,
            positive: true,
            sub: "in stock",
            icon: Package,
        },
    ];

    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card, i) => {
                const Icon = card.icon;
                return (
                    <div
                        key={card.label}
                        className={`dark-card dark-card-hover p-5 animate-in delay-${i + 1}`}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-13 font-medium text-text-secondary">
                                {card.label}
                            </span>
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-bg">
                                <Icon className="h-4 w-4 text-accent" />
                            </div>
                        </div>

                        <div className="mb-1 text-2xl font-bold tracking-tight text-text-primary">
                            {card.value}
                        </div>

                        {card.change && (
                            <div className="flex items-center gap-1 text-xs">
                                {card.positive !== undefined &&
                                    (card.positive ? (
                                        <ArrowUpRight className="h-3 w-3 text-success" />
                                    ) : (
                                        <ArrowDownRight className="h-3 w-3 text-warning" />
                                    ))}
                                <span
                                    className={`font-medium ${
                                        card.positive
                                            ? "text-success"
                                            : "text-warning"
                                    }`}
                                >
                                    {card.change}
                                </span>
                                <span className="ml-1 text-text-dim">
                                    {card.sub}
                                </span>
                            </div>
                        )}
                        {!card.change && card.sub && (
                            <div className="text-xs text-text-dim">
                                {card.sub}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default StatsCards;
