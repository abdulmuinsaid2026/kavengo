"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { OrderDetails, OrderStatus } from "@/types/domains/order";
import { Package, MapPin, CreditCard, Truck, ArrowLeft, ClipboardList, CheckCircle2, Clock } from "lucide-react";

interface OrderDetailViewProps {
    order: OrderDetails;
}

const getStatusStyle = (status: OrderStatus | string) => {
    const s = String(status).toUpperCase();
    switch (s) {
        case 'DELIVERED':
            return { badge: "bg-green-100 text-green-800 border border-green-200", bar: "bg-green-500", progress: "100%" };
        case 'SHIPPED':
            return { badge: "bg-indigo-100 text-indigo-800 border border-indigo-200", bar: "bg-indigo-500", progress: "75%" };
        case 'OUT_FOR_DELIVERY':
            return { badge: "bg-orange-100 text-orange-800 border border-orange-200", bar: "bg-orange-500", progress: "88%" };
        case 'PROCESSING':
            return { badge: "bg-purple-100 text-purple-800 border border-purple-200", bar: "bg-purple-500", progress: "50%" };
        case 'CONFIRMED':
            return { badge: "bg-blue-100 text-blue-800 border border-blue-200", bar: "bg-blue-500", progress: "33%" };
        case 'PENDING':
            return { badge: "bg-yellow-100 text-yellow-800 border border-yellow-200", bar: "bg-yellow-400", progress: "10%" };
        case 'CANCELLED':
        case 'FAILED':
            return { badge: "bg-red-100 text-red-800 border border-red-200", bar: "bg-red-400", progress: "100%" };
        case 'RETURNED':
            return { badge: "bg-gray-100 text-gray-800 border border-gray-200", bar: "bg-gray-400", progress: "100%" };
        case 'REFUNDED':
            return { badge: "bg-pink-100 text-pink-800 border border-pink-200", bar: "bg-pink-400", progress: "100%" };
        default:
            return { badge: "bg-gray-100 text-gray-600 border border-gray-200", bar: "bg-gray-400", progress: "10%" };
    }
};

const formatDate = (date: Date | string) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-US", {
        day: "numeric", month: "short", year: "numeric"
    });
};

const formatCurrency = (amount: number) =>
    `$${(amount ?? 0).toFixed(2)}`;

const OrderDetailView: React.FC<OrderDetailViewProps> = ({ order }) => {
    const router = useRouter();
    const statusStyle = getStatusStyle(order.orderStatus);

    const subtotal = order.orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shippingCost = order.shippingAmount ?? (order.shippingMethod?.shippingOptions?.[0]?.costFirstItem ?? 0);
    const total = order.totalAmount ?? (subtotal + shippingCost);

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

                {/* Header */}
                <div className="flex items-center mb-6 gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-full hover:bg-gray-200 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-2xl sm:text-3xl font-bold flex-grow">Order Detail</h1>
                </div>

                {/* Order ID + Status */}
                <div className="bg-white rounded-xl shadow-sm p-5 mb-6 hover:shadow-md transition-all">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                        <div>
                            <p className="text-sm text-gray-500">Order ID</p>
                            <p className="text-xl font-bold">#{order.shopOrderId}</p>
                            <p className="text-sm text-gray-400 mt-1">Placed on {formatDate(order.orderDate)}</p>
                        </div>
                        <span className={`self-start sm:self-center ${statusStyle.badge} px-4 py-1.5 rounded-full text-sm font-medium`}>
                            {order.orderStatus?.replace(/_/g, " ")}
                        </span>
                    </div>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {/* Shipping Progress */}
                    <div className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-all">
                        <div className="flex items-center mb-4 gap-3">
                            <div className="w-10 h-10 flex items-center justify-center bg-orange-100 text-orange-600 rounded-full">
                                <Truck className="w-5 h-5" />
                            </div>
                            <p className="font-medium text-sm">Shipping Progress</p>
                        </div>
                        <div className="flex items-center text-xs mb-3 gap-2">
                            <span className="px-2 py-1 bg-gray-100 rounded-md truncate max-w-[80px]">Origin</span>
                            <div className="border-t-2 border-dashed border-gray-300 flex-grow" />
                            <span className="px-2 py-1 bg-gray-100 rounded-md truncate max-w-[80px]">
                                {order.shippingAddress?.country || "Destination"}
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div
                                className={`${statusStyle.bar} h-2 rounded-full transition-all duration-700`}
                                style={{ width: statusStyle.progress }}
                            />
                        </div>
                    </div>

                    {/* Estimated Delivery */}
                    <div className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-all">
                        <div className="w-10 h-10 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full mb-3">
                            <Clock className="w-5 h-5" />
                        </div>
                        <p className="text-gray-500 text-sm mb-1">Estimated Arrival</p>
                        <p className="font-bold text-lg">
                            {order.estimatedDeliveryDate ? formatDate(order.estimatedDeliveryDate) : "—"}
                        </p>
                        <div className="mt-3 bg-blue-50 rounded-lg px-3 py-1.5 text-blue-800 text-xs inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Delivery on schedule
                        </div>
                    </div>

                    {/* Carrier */}
                    <div className="bg-white rounded-xl shadow-sm p-5 hover:shadow-md transition-all">
                        <div className="w-10 h-10 flex items-center justify-center bg-purple-100 text-purple-600 rounded-full mb-3">
                            <Package className="w-5 h-5" />
                        </div>
                        <p className="text-gray-500 text-sm mb-1">Carrier</p>
                        <p className="font-bold text-lg">{order.carrierName || order.shippingProvider || "—"}</p>
                        {order.trackingNumber && (
                            <p className="text-xs text-gray-400 mt-1">Tracking: {order.trackingNumber}</p>
                        )}
                    </div>
                </div>

                {/* Shipping + Address */}
                <div className="bg-white rounded-xl shadow-sm p-5 mb-6 hover:shadow-md transition-all">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-gray-500" /> Delivery Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-gray-500 text-xs mb-1">Recipient</p>
                                <p className="font-medium">
                                    {order.customer?.customerName ?? "—"}
                                </p>
                                {order.customer?.email && (
                                    <p className="text-sm text-gray-500">{order.customer.email}</p>
                                )}
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-gray-500 text-xs mb-1">Delivery Address</p>
                                <p className="font-medium">
                                    {order.shippingAddress?.street},&nbsp;
                                    {order.shippingAddress?.city},&nbsp;
                                    {order.shippingAddress?.pincode}
                                </p>
                                <p className="text-sm text-gray-500">{order.shippingAddress?.country}</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-gray-500 text-xs mb-1">Shipping Method</p>
                                <p className="font-medium">{order.shippingMethod?.name || "—"}</p>
                                <p className="text-sm text-gray-500">
                                    {order.shippingMethod?.processingTimeMin}–{order.shippingMethod?.processingTimeMax} days processing
                                </p>
                            </div>
                            {order.trackingNumber && (
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-gray-500 text-xs mb-1">Tracking No.</p>
                                    <p className="font-medium font-mono">{order.trackingNumber}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className="mb-6">
                    <div className="flex items-center mb-4 gap-2">
                        <ClipboardList className="w-5 h-5 text-gray-600" />
                        <h3 className="text-xl font-bold">Items</h3>
                        <span className="ml-1 bg-gray-200 text-gray-700 rounded-full w-6 h-6 flex items-center justify-center text-sm">
                            {order.orderItems?.length ?? 0}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {order.orderItems?.map((item) => {
                            const sku = (item as {productVariant?: {sku?: string}, productVariantId?: number}).productVariant?.sku ?? item.productVariantId?.toString() ?? '—';
                            return (
                                <div
                                    key={item.orderItemId}
                                    className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-all"
                                >
                                    <div className="flex-none w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                                        <Package className="w-8 h-8" />
                                    </div>
                                    <div className="flex-grow">
                                        <p className="font-semibold text-sm text-gray-800">{sku}</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Qty: {item.quantity}</p>
                                    </div>
                                    <p className="font-bold text-gray-900 whitespace-nowrap">
                                        {formatCurrency(item.price * item.quantity)}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Payment + Order Summary */}
                <div className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-all mb-6">
                    <div className="p-5">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-gray-500" /> Order Summary
                            </h3>
                            <span className="text-green-600 text-sm font-medium bg-green-50 px-3 py-1 rounded-full flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Payment Success
                            </span>
                        </div>
                        <p className="text-gray-500 text-sm mb-5">
                            {order.lastFourDigits
                                ? `•••• •••• •••• ${order.lastFourDigits}${order.cardAssociation ? ` · ${order.cardAssociation}` : ''}`
                                : order.paymentMethod
                                    ? `•••• •••• •••• ${order.paymentMethod.last4} — ${order.paymentMethod.cardHolderName}`
                                    : "Payment details unavailable"}
                        </p>

                        <div className="space-y-2 mb-4">
                            {order.orderItems?.map((item) => {
                                const sku = (item as {productVariant?: {sku?: string}, productVariantId?: number}).productVariant?.sku ?? item.productVariantId?.toString() ?? '—';
                                return (
                                    <div key={item.orderItemId} className="flex justify-between text-sm">
                                        <span className="text-gray-600">
                                            {sku}
                                            <span className="text-gray-400 ml-1">×{item.quantity}</span>
                                        </span>
                                        <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                                    </div>
                                );
                            })}
                            {shippingCost > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">Shipping</span>
                                    <span className="font-medium">{formatCurrency(shippingCost)}</span>
                                </div>
                            )}
                            <div className="flex justify-between font-bold pt-3 border-t border-gray-200">
                                <span>Total</span>
                                <span>{formatCurrency(total)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 px-5 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <p className="font-bold text-lg">{formatCurrency(total)}</p>
                            <p className="text-gray-500 text-sm">({order.orderItems?.length ?? 0} items)</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => router.push("/orders")}
                                className="bg-white border border-gray-300 text-gray-800 rounded-full px-6 py-2.5 font-medium hover:bg-gray-100 transition-colors text-sm"
                            >
                                My Orders
                            </button>
                            <button
                                onClick={() => router.push("/")}
                                className="bg-black text-white rounded-full px-8 py-2.5 font-medium hover:bg-gray-800 transition-colors text-sm"
                            >
                                Continue Shopping
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default OrderDetailView;