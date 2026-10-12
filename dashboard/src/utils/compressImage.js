const compressImage = (file, options = {}) => {
    const {
        maxWidth = 1600,
        maxHeight = 1600,
        quality = 0.85,
        type = "image/jpeg",
    } = options;

    return new Promise((resolve, reject) => {
        // Skip if already smaller than 200KB
        if (file.size <= 200 * 1024) {
            return resolve(file);
        }

        const img = new Image();
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        img.onload = () => {
            let { width, height } = img;

            // Calculate new dimensions while maintaining aspect ratio
            if (width > maxWidth || height > maxHeight) {
                const aspectRatio = Math.min(
                    maxWidth / width,
                    maxHeight / height,
                );
                width = Math.round(width * aspectRatio);
                height = Math.round(height * aspectRatio);
            }

            canvas.width = width;
            canvas.height = height;

            // Draw resized image onto canvas
            ctx.drawImage(img, 0, 0, width, height);

            // Convert canvas to Blob
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        return reject(new Error("Failed to compress image"));
                    }

                    const compressedFile = new File(
                        [blob],
                        file.name.replace(/\.[^/.]+$/, ".jpg"),
                        { type },
                    );

                    const reduction = Math.round(
                        (1 - compressedFile.size / file.size) * 100,
                    );

                    console.log(
                        `🖼 Compressed: ${formatSize(file.size)} → ${formatSize(compressedFile.size)} (${reduction}% smaller)`,
                    );

                    // Clean up
                    URL.revokeObjectURL(img.src);

                    resolve(compressedFile);
                },
                type,
                quality,
            );
        };

        img.onerror = () => {
            URL.revokeObjectURL(img.src);
            reject(new Error("Failed to load image"));
        };

        img.src = URL.createObjectURL(file);
    });
};

const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

export { compressImage };
