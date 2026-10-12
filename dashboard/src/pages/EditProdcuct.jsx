import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import ProductForm from "../components/ProductForm";
import { Pencil } from "lucide-react";

const EditProduct = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getProduct(id)
            .then((p) => {
                const imageFileIds =
                    Array.isArray(p.images) && p.images.length
                        ? p.images
                              .map((img) => img.telegram_file_id)
                              .filter(Boolean)
                        : p.image?.telegram_file_id
                          ? [p.image.telegram_file_id]
                          : [];

                setProduct({
                    name: p.name,
                    colorway: p.colorway || "",
                    description: p.description || "",
                    price: p.price,
                    brandId: p.brand_id,
                    modelId: p.model_id || "",
                    sizes: p.sizes.map((s) => ({
                        size: s.size,
                        inStock: s.in_stock,
                    })),
                    imageFileIds,
                });
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [id]);

    async function handleSubmit(data) {
        await api.updateProduct(id, data);
        navigate("/products");
    }

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="skeleton h-8 w-56" />
                <div className="skeleton h-48 rounded-2xl" />
                <div className="skeleton h-64 rounded-2xl" />
            </div>
        );
    }

    if (!product) {
        return (
            <div className="text-center py-16">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-error-bg">
                    <Pencil className="h-8 w-8 text-error" />
                </div>
                <p className="text-sm text-error">Product not found</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in flex flex-col">
            <div className="sticky top-14 z-20 border-b border-border-subtle bg-bg-body pb-4 pt-4 lg:top-0">
                <div>
                    <div className="mb-1 flex items-center gap-2 text-13 text-text-dim">
                        <span>Products</span>
                        <span>/</span>
                        <span className="text-text-primary">Edit</span>
                    </div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-text-primary">
                        <Pencil className="h-6 w-6 text-accent" />
                        Edit Product
                        <span className="text-base font-semibold text-text-dim">
                            #{id}
                        </span>
                    </h1>
                </div>
            </div>
            <ProductForm
                initialData={product}
                onSubmit={handleSubmit}
                submitLabel="Update Product"
                className="self-center"
            />
        </div>
    );
};

export default EditProduct;
