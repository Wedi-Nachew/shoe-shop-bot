import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import ProductForm from "../components/ProductForm";
import { PlusCircle } from "lucide-react";

const AddProduct = () => {
    const navigate = useNavigate();

    async function handleSubmit(data) {
        await api.createProduct(data);
        navigate("/products");
    }

    return (
        <div className="space-y-6 animate-in">
            <div className="sticky top-14 z-20 border-b border-border-subtle bg-bg-body pb-4 pt-4 lg:top-0">
                <div>
                    <div className="mb-1 flex items-center gap-2 text-13 text-text-dim">
                        <span>Products</span>
                        <span>/</span>
                        <span className="text-text-primary">Add Product</span>
                    </div>
                    <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-text-primary">
                        <PlusCircle className="h-6 w-6 text-accent" />
                        Add Product
                    </h1>
                </div>
            </div>
            <ProductForm onSubmit={handleSubmit} submitLabel="Create Product" />
        </div>
    );
};

export default AddProduct;
