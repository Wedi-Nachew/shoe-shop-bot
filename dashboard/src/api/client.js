const API_BASE = "/api";

//  Get Telegram WebApp initData for authentication
const getAuthHeaders = () => {
    const headers = { "Content-Type": "application/json" };

    // Try Telegram WebApp first
    if (window.Telegram?.WebApp?.initData) {
        headers["X-Telegram-Init-Data"] = window.Telegram.WebApp.initData;
    }

    // Dev fallback
    if (import.meta.env.DEV && !window.Telegram?.WebApp?.initData) {
        headers["X-Dev-User-Id"] = import.meta.env.VITE_OWNER_ID || "";
    }

    return headers;
};

const request = async (endpoint, options = {}) => {
    const url = `${API_BASE}${endpoint}`;
    const headers = getAuthHeaders();

    // Don't set Content-Type for FormData
    if (options.body instanceof FormData) {
        delete headers["Content-Type"];
    }

    const response = await fetch(url, {
        ...options,
        headers: {
            ...headers,
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Request failed: ${response.status}`);
    }

    return response.json();
};

export const api = {
    // Stats
    getStats: (days = 30) => request(`/stats?days=${days}`),

    // Products
    getProducts: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/products?${query}`);
    },
    getProduct: (id) => request(`/products/${id}`),
    createProduct: (data) =>
        request("/products", {
            method: "POST",
            body: JSON.stringify(data),
        }),
    updateProduct: (id, data) =>
        request(`/products/${id}`, {
            method: "PUT",
            body: JSON.stringify(data),
        }),
    deleteProduct: (id) => request(`/products/${id}`, { method: "DELETE" }),
    toggleStock: (id) => request(`/products/${id}/stock`, { method: "PUT" }),
    updateSizeStock: (id, size, quantity) =>
        request(`/products/${id}/sizes/${size}/stock`, {
            method: "PUT",
            body: JSON.stringify({ quantity }),
        }),

    // Brands
    getBrands: () => request("/brands"),
    createBrand: (data) =>
        request("/brands", {
            method: "POST",
            body: JSON.stringify(data),
        }),
    getModels: (brandId) => request(`/brands/${brandId}/models`),
    createModel: (brandId, data) =>
        request(`/brands/${brandId}/models`, {
            method: "POST",
            body: JSON.stringify(data),
        }),

    // Orders
    getOrders: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/orders?${query}`);
    },
    getOrder: (id) => request(`/orders/${id}`),
    updateOrderStatus: (id, status) =>
        request(`/orders/${id}/status`, {
            method: "PUT",
            body: JSON.stringify({ status }),
        }),

    // Upload
    uploadImage: async (file) => {
        const formData = new FormData();
        formData.append("image", file);

        return request("/upload", {
            method: "POST",
            body: formData,
        });
    },

    // Auth
    verifyAuth: () => request("/auth/verify", { method: "POST" }),

    // Image URL helper
    getImageUrl: (fileId) => `/api/images/${fileId}`,
};
