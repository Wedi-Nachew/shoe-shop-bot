import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import {
    PlusCircle,
    Search,
    X,
    Pencil,
    Trash2,
    Footprints,
} from "lucide-react";

const Products = () => {
    const [products, setProducts] = useState([]);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    const loadProducts = (searchQuery = "") => {
        setLoading(true);
        const params = searchQuery ? { search: searchQuery } : {};
        api.getProducts(params)
            .then((data) => {
                setProducts(data.products);
                setTotal(data.total);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        api.getProducts()
            .then((data) => {
                setProducts(data.products);
                setTotal(data.total);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        loadProducts(search);
    };

    const handleToggleStock = async (id) => {
        try {
            await api.toggleStock(id);
            loadProducts(search);
        } catch (err) {
            alert(err.message);
        }
    };

    const handleDelete = async (id, name) => {
        if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
        try {
            await api.deleteProduct(id);
            loadProducts(search);
        } catch (err) {
            alert(err.message);
        }
    };

    return (
        <div className="space-y-6">
            <div className="sticky top-14 z-20 space-y-4 border-b border-border-subtle bg-bg-body pb-4 pt-4 lg:top-0">
                {/* Header */}
                <div className="flex flex-col gap-3 animate-in sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="mb-1 flex items-center gap-2 text-13 text-text-dim">
                            <span>Dashboards</span>
                            <span>/</span>
                            <span className="text-text-primary">Products</span>
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-text-primary">
                            Products
                            <span className="ml-2 text-base font-semibold text-text-dim">
                                ({total})
                            </span>
                        </h1>
                    </div>
                    <Link
                        to="/products/new"
                        className="btn-accent w-full gap-2 px-4 py-2.5 text-13 sm:w-auto"
                    >
                        <PlusCircle className="w-4 h-4" />
                        Add Product
                    </Link>
                </div>

                {/* Search */}
                <form
                    onSubmit={handleSearch}
                    className="flex flex-col gap-2 animate-in delay-1 sm:flex-row"
                >
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-dim" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search products..."
                            className="dark-input w-full pl-10"
                        />
                    </div>
                    <button
                        type="submit"
                        className="rounded-xl border border-border-card bg-bg-card px-4 py-2.5 text-13 font-medium text-text-secondary transition-colors hover:text-text-primary sm:w-auto"
                    >
                        Search
                    </button>
                    {search && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearch("");
                                loadProducts();
                            }}
                            className="px-3 py-2.5 text-text-dim transition-colors hover:text-text-primary"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </form>
            </div>

            {loading ? (
                <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="skeleton h-16 rounded-xl" />
                    ))}
                </div>
            ) : products.length === 0 ? (
                <div className="text-center py-16">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-muted">
                        <Footprints className="h-8 w-8 text-text-dim" />
                    </div>
                    <p className="mb-2 text-sm text-text-secondary">
                        No products found.
                    </p>
                    <Link
                        to="/products/new"
                        className="text-sm font-medium text-accent hover:underline"
                    >
                        Add your first product →
                    </Link>
                </div>
            ) : (
                <>
                    {/* ── Desktop: table (md and up) ── */}
                    <div className="dark-card overflow-hidden animate-in delay-2 hidden md:block">
                        <table className="w-full text-13">
                            <thead>
                                <tr className="border-b border-border-subtle text-left text-11 font-semibold uppercase tracking-wider text-text-dim">
                                    <th className="px-5 py-3.5">Product</th>
                                    <th className="px-5 py-3.5">Brand</th>
                                    <th className="px-5 py-3.5">Price</th>
                                    <th className="px-5 py-3.5">Stock</th>
                                    <th className="px-5 py-3.5">Status</th>
                                    <th className="px-5 py-3.5">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {products.map((product) => (
                                    <tr
                                        key={product.id}
                                        className="group border-b border-border-subtle transition-colors hover:bg-surface-veil"
                                    >
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                {product.image ? (
                                                    <img
                                                        src={api.getImageUrl(
                                                            product.image
                                                                .telegram_file_id,
                                                        )}
                                                        alt=""
                                                        className="h-10 w-10 rounded-lg object-cover ring-1 ring-border-card shrink-0"
                                                    />
                                                ) : (
                                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-muted">
                                                        <Footprints className="h-5 w-5 text-text-dim" />
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <div className="font-semibold text-text-primary truncate">
                                                        {product.name}
                                                    </div>
                                                    {product.colorway && (
                                                        <div className="text-11 text-text-dim truncate">
                                                            {product.colorway}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-text-secondary">
                                            {product.brand_name}
                                            {product.model_name && (
                                                <span className="text-text-dim">
                                                    {" "}
                                                    / {product.model_name}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-5 py-3.5 font-semibold text-text-primary whitespace-nowrap">
                                            {Number(
                                                product.price,
                                            ).toLocaleString()}{" "}
                                            <span className="text-11 font-normal text-text-dim">
                                                ETB
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-1.5">
                                                <span
                                                    className={`h-2 w-2 shrink-0 rounded-full ${product.total_stock > 0 ? "bg-success" : "bg-error"}`}
                                                />
                                                <span className="text-text-secondary whitespace-nowrap">
                                                    {product.total_stock} units
                                                </span>
                                                <span className="text-11 text-text-dim whitespace-nowrap">
                                                    (
                                                    {
                                                        product.available_size_count
                                                    }{" "}
                                                    sizes)
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <button
                                                onClick={() =>
                                                    handleToggleStock(
                                                        product.id,
                                                    )
                                                }
                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-11 font-semibold transition-colors whitespace-nowrap ${
                                                    product.in_stock
                                                        ? "border border-success-border bg-success-bg text-success"
                                                        : "border border-error-border bg-error-bg text-error"
                                                }`}
                                            >
                                                <span
                                                    className={`h-1.5 w-1.5 rounded-full ${product.in_stock ? "bg-success" : "bg-error"}`}
                                                />
                                                {product.in_stock
                                                    ? "Active"
                                                    : "Hidden"}
                                            </button>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <div className="flex gap-1 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                                                <Link
                                                    to={`/products/${product.id}/edit`}
                                                    className="rounded-lg p-2 text-text-dim transition-colors hover:bg-accent-hover hover:text-accent"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Link>
                                                <button
                                                    onClick={() =>
                                                        handleDelete(
                                                            product.id,
                                                            product.name,
                                                        )
                                                    }
                                                    className="rounded-lg p-2 text-text-dim transition-colors hover:bg-error-soft hover:text-error"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* ── Mobile: card list (below md) ── */}
                    <div className="space-y-2 animate-in delay-2 md:hidden">
                        {products.map((product) => (
                            <div
                                key={product.id}
                                className="dark-card p-3.5 flex items-center gap-3"
                            >
                                {/* Thumbnail */}
                                {product.image ? (
                                    <img
                                        src={api.getImageUrl(
                                            product.image.telegram_file_id,
                                        )}
                                        alt=""
                                        className="h-14 w-14 shrink-0 rounded-xl object-cover ring-1 ring-border-card"
                                    />
                                ) : (
                                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface-muted">
                                        <Footprints className="h-6 w-6 text-text-dim" />
                                    </div>
                                )}

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-text-primary text-13 truncate leading-tight">
                                                {product.name}
                                            </p>
                                            <p className="text-11 text-text-dim truncate">
                                                {product.brand_name}
                                                {product.model_name &&
                                                    ` / ${product.model_name}`}
                                                {product.colorway &&
                                                    ` · ${product.colorway}`}
                                            </p>
                                        </div>
                                        <p className="shrink-0 font-semibold text-13 text-text-primary whitespace-nowrap">
                                            {Number(
                                                product.price,
                                            ).toLocaleString()}{" "}
                                            <span className="text-11 font-normal text-text-dim">
                                                ETB
                                            </span>
                                        </p>
                                    </div>

                                    <div className="mt-2 flex items-center justify-between gap-2">
                                        {/* Stock */}
                                        <div className="flex items-center gap-1.5 text-11 text-text-secondary">
                                            <span
                                                className={`h-1.5 w-1.5 rounded-full ${product.total_stock > 0 ? "bg-success" : "bg-error"}`}
                                            />
                                            {product.total_stock} units ·{" "}
                                            {product.available_size_count} sizes
                                        </div>

                                        {/* Right: status toggle + actions */}
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() =>
                                                    handleToggleStock(
                                                        product.id,
                                                    )
                                                }
                                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-11 font-semibold transition-colors ${
                                                    product.in_stock
                                                        ? "border border-success-border bg-success-bg text-success"
                                                        : "border border-error-border bg-error-bg text-error"
                                                }`}
                                            >
                                                <span
                                                    className={`h-1.5 w-1.5 rounded-full ${product.in_stock ? "bg-success" : "bg-error"}`}
                                                />
                                                {product.in_stock
                                                    ? "Active"
                                                    : "Hidden"}
                                            </button>
                                            <Link
                                                to={`/products/${product.id}/edit`}
                                                className="rounded-lg p-1.5 text-text-dim transition-colors hover:bg-accent-hover hover:text-accent"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </Link>
                                            <button
                                                onClick={() =>
                                                    handleDelete(
                                                        product.id,
                                                        product.name,
                                                    )
                                                }
                                                className="rounded-lg p-1.5 text-text-dim transition-colors hover:bg-error-soft hover:text-error"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default Products;
