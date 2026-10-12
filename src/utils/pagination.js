// Calculate pagination metadata
const paginate = (totalItems, currentPage, perPage) => {
    const totalPages = Math.ceil(totalItems / perPage);
    const hasNext = currentPage < totalPages - 1;
    const hasPrev = currentPage > 0;
    const offset = currentPage * perPage;

    return {
        totalItems,
        totalPages,
        currentPage,
        perPage,
        hasNext,
        hasPrev,
        offset,
        showing: {
            from: offset + 1,
            to: Math.min(offset + perPage, totalItems),
        },
    };
};

// Encode filters into a compact callback string
//  Telegram limits callback_data to 64 bytes

const encodeFilters = (filters) => {
    const brandId = filters.brandId || 0;
    const modelId = filters.modelId || 0;
    const size = filters.size || 0;
    return `${brandId}:${modelId}:${size}`;
};

// Decode filter string back to object

const decodeFilters = (filterString) => {
    const parts = filterString.split(":");
    return {
        brandId: parseInt(parts[0]) || null,
        modelId: parseInt(parts[1]) || null,
        size: parts[2] !== "0" ? parts[2] : null,
    };
};

module.exports = {
    paginate,
    encodeFilters,
    decodeFilters,
};
