import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import AddProduct from "./pages/AddProduct";
import EditProduct from "./pages/EditProdcuct";
import Orders from "./pages/Orders";
import { useEffect, useState } from "react";
import { api } from "./api/client";

export default function App() {
    const [authState, setAuthState] = useState(() => {
        if (typeof window === "undefined") {
            return "checking";
        }

        const tg = window.Telegram?.WebApp;
        return !tg?.initData && !import.meta.env.DEV ? "failed" : "checking";
    }); // checking | ok | failed

    useEffect(() => {
        if (authState !== "checking") {
            return;
        }

        // Check if we're inside Telegram WebApp
        const tg = window.Telegram?.WebApp;

        // Expand WebApp to full height
        if (tg) {
            tg.ready();
            tg.expand();
        }

        // Verify with backend
        api.verifyAuth()
            .then(() => setAuthState("ok"))
            .catch(() => setAuthState("failed"));
    }, [authState]);

    if (authState === "checking") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="text-4xl mb-4">👟</div>
                    <p className="text-gray-500">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (authState === "failed") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center max-w-sm">
                    <div className="text-4xl mb-4">🔒</div>
                    <h1 className="text-xl font-bold text-gray-800 mb-2">
                        Access Denied
                    </h1>
                    <p className="text-gray-500 text-sm">
                        This dashboard can only be accessed through the Telegram
                        bot. Send{" "}
                        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                            /admin
                        </code>{" "}
                        to the bot and tap "Open Dashboard".
                    </p>
                </div>
            </div>
        );
    }
    return (
        <Routes>
            <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="products" element={<Products />} />
                <Route path="products/new" element={<AddProduct />} />
                <Route path="products/:id/edit" element={<EditProduct />} />
                <Route path="orders" element={<Orders />} />
                <Route path="*" element={<Navigate to="/" />} />
            </Route>
        </Routes>
    );
}
