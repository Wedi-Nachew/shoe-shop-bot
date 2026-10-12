import { useState, useRef, useEffect, useMemo } from "react";
import { api } from "../api/client";
import { Upload, X, Loader2 } from "lucide-react";
import { compressImage } from "../utils/compressImage";

const MultiImageUpload = ({ value = [], onChange }) => {
    const [uploading, setUploading] = useState(false);
    const [status, setStatus] = useState("");
    const [error, setError] = useState(null);
    const inputRef = useRef(null);
    const valueRef = useRef([]);

    const imageIds = useMemo(
        () =>
            Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [],
        [value],
    );

    useEffect(() => {
        valueRef.current = imageIds;
    }, [imageIds]);

    const validateFile = (file) => {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            return "Only JPEG, PNG, and WebP images allowed";
        }

        if (file.size > 10 * 1024 * 1024) {
            return "Image must be under 10MB";
        }

        return null;
    };

    const appendImageId = (fileId) => {
        const next = [...valueRef.current, fileId];
        valueRef.current = next;
        onChange(next);
    };

    const handleFiles = async (fileList) => {
        const files = Array.from(fileList || []);
        if (files.length === 0) return;

        setError(null);
        setUploading(true);
        setStatus("");

        try {
            for (const file of files) {
                const validationError = validateFile(file);
                if (validationError) {
                    setError(validationError);
                    continue;
                }

                try {
                    setStatus("Compressing...");
                    const compressed = await compressImage(file);

                    const sizeKB = (compressed.size / 1024).toFixed(0);
                    setStatus(`Uploading (${sizeKB}KB)...`);

                    const result = await api.uploadImage(compressed);
                    appendImageId(result.fileId);
                } catch (err) {
                    setError(err.message);
                }
            }
        } finally {
            setUploading(false);
            setStatus("");
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
    };

    const handleChange = (e) => {
        handleFiles(e.target.files);
        e.target.value = "";
    };

    const handleRemove = (index) => {
        const next = imageIds.filter((_, i) => i !== index);
        valueRef.current = next;
        onChange(next);
    };

    const dropZoneCopy = imageIds.length
        ? "Drop images here or click to add more"
        : "Drop images here or click to browse";

    return (
        <div className="space-y-3">
            <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => inputRef.current?.click()}
                className="group cursor-pointer rounded-xl border-2 border-dashed border-border-input p-6 text-center transition-colors duration-200 hover:border-accent hover:bg-accent-bg"
            >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-muted transition-colors">
                    <Upload className="h-6 w-6 text-text-dim transition-colors group-hover:text-accent" />
                </div>
                <p className="text-13 font-medium text-text-secondary">
                    {dropZoneCopy}
                </p>
                <p className="mt-1 text-11 text-text-dim">
                    JPEG, PNG, WebP - Auto-compressed before upload (max 10MB)
                </p>
                {uploading && (
                    <div className="mt-2 flex items-center justify-center gap-2 text-11 text-text-dim">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        {status || "Uploading images..."}
                    </div>
                )}
            </div>

            {imageIds.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                    {imageIds.map((fileId, index) => (
                        <div
                            key={`${fileId}-${index}`}
                            className="relative group shrink-0"
                        >
                            <img
                                src={api.getImageUrl(fileId)}
                                alt={`Product ${index + 1}`}
                                className={`w-24 h-24 rounded-xl object-cover ring-1 ${
                                    index === 0
                                        ? "ring-accent-border"
                                        : "ring-border-card"
                                }`}
                            />
                            {index === 0 && (
                                <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-10 font-semibold text-accent">
                                    Primary
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={() => handleRemove(index)}
                                aria-label="Remove image"
                                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
                            >
                                <X className="h-3.5 w-3.5 text-error" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <input
                ref={inputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleChange}
                className="hidden"
            />

            {error && <p className="text-12 font-medium text-error">{error}</p>}
        </div>
    );
};

export default MultiImageUpload;
