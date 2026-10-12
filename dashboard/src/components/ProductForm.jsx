import { useState, useEffect } from "react";
import { api } from "../api/client";
import MultiImageUpload from "./ImageUpload";
import SizeManager from "./SizeManager";
import { AlertCircle, Loader2 } from "lucide-react";

const ProductForm = ({
    initialData,
    onSubmit,
    submitLabel = "Save Product",
}) => {
    const [brands, setBrands] = useState([]);
    const [models, setModels] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const buildInitialForm = (data = {}) => {
        const { imageFileId, imageFileIds, ...rest } = data;
        const normalizedImageFileIds = Array.isArray(imageFileIds)
            ? imageFileIds
            : imageFileId
              ? [imageFileId]
              : [];

        return {
            name: "",
            colorway: "",
            description: "",
            price: "",
            brandId: "",
            brandName: "",
            modelId: "",
            modelName: "",
            modelShortName: "",
            sizes: [],
            imageFileIds: normalizedImageFileIds,
            ...rest,
        };
    };

    const [form, setForm] = useState(buildInitialForm(initialData));

    const [newBrand, setNewBrand] = useState(false);
    const [newModel, setNewModel] = useState(false);

    useEffect(() => {
        api.getBrands().then(setBrands).catch(console.error);
    }, []);

    useEffect(() => {
        if (form.brandId && !newBrand) {
            api.getModels(form.brandId).then(setModels).catch(console.error);
        } else {
            setModels([]);
        }
    }, [form.brandId, newBrand]);

    const updateField = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await onSubmit(form);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const sectionClass = "dark-card p-5 space-y-4";
    const labelClass = "mb-1.5 block text-13 font-semibold text-text-secondary";
    const segmentedWrapClass =
        "inline-flex items-center gap-1 rounded-full border border-border-input bg-bg-input p-1";
    const segmentButtonClass = (active) =>
        `px-3 py-1.5 text-11 font-semibold rounded-full transition-colors ${
            active
                ? "bg-accent text-bg-body"
                : "text-text-dim hover:text-text-primary"
        }`;

    const setBrandMode = (isNew) => {
        setNewBrand(isNew);
        updateField("brandId", "");
        updateField("brandName", "");
        updateField("modelId", "");
        updateField("modelName", "");
        updateField("modelShortName", "");
    };

    const setModelMode = (isNew) => {
        setNewModel(isNew);
        updateField("modelId", "");
        updateField("modelName", "");
        updateField("modelShortName", "");
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
            {error && (
                <div className="flex items-center gap-2 rounded-xl border border-error-border bg-error-soft px-4 py-3 text-13 text-error">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* Image */}
            <div className={sectionClass}>
                <label className={labelClass}>Product Images</label>
                <MultiImageUpload
                    value={form.imageFileIds}
                    onChange={(fileIds) => updateField("imageFileIds", fileIds)}
                />
            </div>

            {/* Basic Info */}
            <div className={sectionClass}>
                <h3 className="text-11 font-semibold uppercase tracking-wider text-text-dim">
                    Basic Info
                </h3>

                <div>
                    <label className={labelClass}>
                        Product Name <span className="text-error">*</span>
                    </label>
                    <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => updateField("name", e.target.value)}
                        placeholder="Air Jordan 4 Retro"
                        className="dark-input w-full"
                    />
                </div>

                <div>
                    <label className={labelClass}>Colorway</label>
                    <input
                        type="text"
                        value={form.colorway}
                        onChange={(e) =>
                            updateField("colorway", e.target.value)
                        }
                        placeholder="Military Black"
                        className="dark-input w-full"
                    />
                </div>

                <div>
                    <label className={labelClass}>Description</label>
                    <textarea
                        value={form.description}
                        onChange={(e) =>
                            updateField("description", e.target.value)
                        }
                        placeholder="Optional product description..."
                        rows={3}
                        className="dark-input w-full resize-none"
                    />
                </div>
            </div>

            {/* Brand & Model */}
            <div className={sectionClass}>
                <h3 className="text-11 font-semibold uppercase tracking-wider text-text-dim">
                    Brand & Model
                </h3>

                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="text-13 font-semibold text-text-secondary">
                            Brand <span className="text-error">*</span>
                        </label>
                        <div className={segmentedWrapClass}>
                            <button
                                type="button"
                                onClick={() => setBrandMode(false)}
                                aria-pressed={!newBrand}
                                className={segmentButtonClass(!newBrand)}
                            >
                                Existing
                            </button>
                            <button
                                type="button"
                                onClick={() => setBrandMode(true)}
                                aria-pressed={newBrand}
                                className={segmentButtonClass(newBrand)}
                            >
                                New
                            </button>
                        </div>
                    </div>

                    {newBrand ? (
                        <input
                            type="text"
                            value={form.brandName}
                            onChange={(e) =>
                                updateField("brandName", e.target.value)
                            }
                            placeholder="New brand name"
                            className="dark-input w-full"
                        />
                    ) : (
                        <select
                            required={!newBrand}
                            value={form.brandId}
                            onChange={(e) =>
                                updateField(
                                    "brandId",
                                    parseInt(e.target.value) || "",
                                )
                            }
                            className="dark-input w-full"
                        >
                            <option value="">Select brand...</option>
                            {brands.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.emoji} {b.name} ({b.product_count}{" "}
                                    products)
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                <div>
                    <div className="flex items-center justify-between mb-1.5">
                        <label className="text-13 font-semibold text-text-secondary">
                            Model
                        </label>
                        <div className={segmentedWrapClass}>
                            <button
                                type="button"
                                onClick={() => setModelMode(false)}
                                aria-pressed={!newModel}
                                className={segmentButtonClass(!newModel)}
                            >
                                Existing
                            </button>
                            <button
                                type="button"
                                onClick={() => setModelMode(true)}
                                aria-pressed={newModel}
                                className={segmentButtonClass(newModel)}
                            >
                                New
                            </button>
                        </div>
                    </div>

                    {newModel ? (
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={form.modelName}
                                onChange={(e) =>
                                    updateField("modelName", e.target.value)
                                }
                                placeholder="Model name (e.g. Jordan 4)"
                                className="dark-input flex-1"
                            />
                            <input
                                type="text"
                                value={form.modelShortName}
                                onChange={(e) =>
                                    updateField(
                                        "modelShortName",
                                        e.target.value,
                                    )
                                }
                                placeholder="Short (J4)"
                                className="dark-input w-24"
                            />
                        </div>
                    ) : (
                        <select
                            value={form.modelId}
                            onChange={(e) =>
                                updateField(
                                    "modelId",
                                    parseInt(e.target.value) || "",
                                )
                            }
                            className="dark-input w-full"
                        >
                            <option value="">No model / Select...</option>
                            {models.map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name} ({m.product_count} products)
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            </div>

            {/* Pricing */}
            <div className={sectionClass}>
                <h3 className="text-11 font-semibold uppercase tracking-wider text-text-dim">
                    Pricing
                </h3>
                <div>
                    <label className={labelClass}>
                        Price (ETB) <span className="text-error">*</span>
                    </label>
                    <input
                        type="number"
                        required
                        min="0"
                        step="100"
                        value={form.price}
                        onChange={(e) => updateField("price", e.target.value)}
                        placeholder="8500"
                        className="dark-input w-full"
                    />
                </div>
            </div>

            {/* Sizes */}
            <div className={sectionClass}>
                <h3 className="text-11 font-semibold uppercase tracking-wider text-text-dim">
                    Sizes & Stock <span className="text-error">*</span>
                </h3>
                <SizeManager
                    value={form.sizes}
                    onChange={(sizes) => updateField("sizes", sizes)}
                />
            </div>

            {/* Submit */}
            <button
                type="submit"
                disabled={loading}
                className="btn-accent flex w-full items-center justify-center gap-2 py-3"
            >
                {loading ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                    </>
                ) : (
                    submitLabel
                )}
            </button>
        </form>
    );
};

export default ProductForm;
