import { useState } from "react";
import { Plus, X } from "lucide-react";

const ALL_SIZES = [
    "36",
    "37",
    "38",
    "39",
    "40",
    "41",
    "42",
    "43",
    "44",
    "45",
    "46",
    "47",
];

const SizeManager = ({ value = [], onChange }) => {
    const [rangeFrom, setRangeFrom] = useState("40");
    const [rangeTo, setRangeTo] = useState("44");
    const [rangeStock, setRangeStock] = useState("3");

    const selectedSizes = new Set(value.map((s) => s.size));

    const toggleSize = (size) => {
        if (selectedSizes.has(size)) {
            onChange(value.filter((s) => s.size !== size));
        } else {
            onChange(
                [...value, { size, inStock: 1 }].sort(
                    (a, b) => parseInt(a.size) - parseInt(b.size),
                ),
            );
        }
    };

    const updateStock = (size, stock) => {
        onChange(
            value.map((s) =>
                s.size === size
                    ? { ...s, inStock: Math.max(0, parseInt(stock) || 0) }
                    : s,
            ),
        );
    };

    const addRange = () => {
        const from = parseInt(rangeFrom);
        const to = parseInt(rangeTo);
        const stock = parseInt(rangeStock) || 1;

        if (from > to) return;

        const newSizes = [...value];
        for (let i = from; i <= to; i++) {
            const sizeStr = i.toString();
            if (!selectedSizes.has(sizeStr)) {
                newSizes.push({ size: sizeStr, inStock: stock });
            }
        }

        onChange(newSizes.sort((a, b) => parseInt(a.size) - parseInt(b.size)));
    };

    const removeSize = (size) => {
        onChange(value.filter((s) => s.size !== size));
    };

    return (
        <div className="space-y-5">
            {/* Quick toggle */}
            <div>
                <label className="mb-2.5 block text-11 font-semibold uppercase tracking-wider text-text-dim">
                    Quick Add Sizes
                </label>
                <div className="flex flex-wrap gap-2">
                    {ALL_SIZES.map((size) => (
                        <button
                            key={size}
                            type="button"
                            onClick={() => toggleSize(size)}
                            className={`h-11 w-11 rounded-xl border text-13 font-semibold transition-all duration-200 ${
                                selectedSizes.has(size)
                                    ? "border-success-border bg-accent text-bg-body shadow-md"
                                    : "border-border-input bg-bg-input text-text-secondary hover:text-text-primary"
                            }`}
                        >
                            {size}
                        </button>
                    ))}
                </div>
            </div>

            {/* Range add */}
            <div className="flex items-end gap-2">
                <div>
                    <label className="mb-1 block text-11 font-medium text-text-dim">
                        From
                    </label>
                    <input
                        type="number"
                        value={rangeFrom}
                        onChange={(e) => setRangeFrom(e.target.value)}
                        className="dark-input w-18"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-11 font-medium text-text-dim">
                        To
                    </label>
                    <input
                        type="number"
                        value={rangeTo}
                        onChange={(e) => setRangeTo(e.target.value)}
                        className="dark-input w-18"
                    />
                </div>
                <div>
                    <label className="mb-1 block text-11 font-medium text-text-dim">
                        Stock
                    </label>
                    <input
                        type="number"
                        value={rangeStock}
                        onChange={(e) => setRangeStock(e.target.value)}
                        className="dark-input w-18"
                    />
                </div>
                <button
                    type="button"
                    onClick={addRange}
                    className="btn-accent gap-1.5 px-4 py-2.5 text-13"
                >
                    <Plus className="w-4 h-4" />
                    Add Range
                </button>
            </div>

            {/* Size list with stock inputs */}
            {value.length > 0 && (
                <div>
                    <label className="mb-2.5 block text-11 font-semibold uppercase tracking-wider text-text-dim">
                        Stock per Size
                    </label>
                    <div className="space-y-2">
                        {value.map((s) => (
                            <div
                                key={s.size}
                                className="group flex items-center gap-3 rounded-xl border border-border-subtle bg-surface-veil px-4 py-2.5"
                            >
                                <span className="w-10 text-13 font-bold text-text-primary">
                                    {s.size}
                                </span>
                                <input
                                    type="number"
                                    min="0"
                                    value={s.inStock}
                                    onChange={(e) =>
                                        updateStock(s.size, e.target.value)
                                    }
                                    className="dark-input w-20 py-1.5"
                                />
                                <span className="text-11 font-medium text-text-dim">
                                    units
                                </span>
                                <button
                                    type="button"
                                    onClick={() => removeSize(s.size)}
                                    className="ml-auto rounded-lg p-1 text-text-dim opacity-0 transition-all group-hover:opacity-100 hover:text-error"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <p className="mt-3 text-12 font-medium text-text-dim">
                        Total:{" "}
                        <span className="text-text-secondary">
                            {value.reduce((sum, s) => sum + s.inStock, 0)} units
                        </span>{" "}
                        across{" "}
                        <span className="text-text-secondary">
                            {value.length} sizes
                        </span>
                    </p>
                </div>
            )}
        </div>
    );
};

export default SizeManager;
