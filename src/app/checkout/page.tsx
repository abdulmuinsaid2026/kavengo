/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import useDataFetch from "@/hooks/use-data-fetch";
import * as iyzicoServices from "@/services/iyzico";
import * as shippingServices from "@/services/shippingMethod";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { PaymentInitiateRequest, PaymentInitiateResponse } from "@/services/iyzico";
import { ShippingMethod } from "@/types/domains/shipping_method";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
import { toast } from "sonner";
import CheckoutForm from "./components/CheckoutForm";
import ThreeDSModal from "./components/ThreeDSModal";
import { clearBuyNowItem } from "@/store/slices/buyNowSlice";

function CheckoutPageInner() {
    const dispatch = useAppDispatch();
    const searchParams = useSearchParams();
    const isBuyNow = searchParams.get("mode") === "buynow";
    const paymentResult = searchParams.get("payment");

    const { items: cartItems, totalAmount } = useAppSelector((state) => state.cart);
    const buyNowItem = useAppSelector((state) => state.buyNow.item);
    const { user, authenticated } = useAppSelector((state) => state.auth);

    const [shippingMethods, setShippingMethods] = useState<Record<number, ShippingMethod>>({});
    const [destinationCountry, setDestinationCountry] = useState<string>("United States");
    const destCountryRef = useRef(destinationCountry);
    destCountryRef.current = destinationCountry;
    const [threeDSHtml, setThreeDSHtml] = useState<string | null>(null);

    // Show toast if redirected back from iyzico callback with a failure
    useEffect(() => {
        if (paymentResult === "failed") {
            const reason = searchParams.get("reason");
            const messages: Record<string, string> = {
                "3ds_failed": "Payment was declined by your bank. Please try again.",
                "confirmation_failed": "Payment could not be confirmed. Please try again.",
                "server_error": "A server error occurred. Please try again.",
            };
            toast.error(messages[reason ?? ""] ?? "Payment failed. Please try again.");
        }
    }, []);

    useEffect(() => {
        if (!isBuyNow) dispatch(clearBuyNowItem());
    }, []);

    const effectiveItems = useMemo(
        () => (isBuyNow && buyNowItem ? [buyNowItem] : cartItems),
        [isBuyNow, buyNowItem, cartItems]
    );
    const effectiveTotal = useMemo(
        () => (isBuyNow && buyNowItem ? buyNowItem.price * buyNowItem.quantity : totalAmount),
        [isBuyNow, buyNowItem, totalAmount]
    );

    const initiatePaymentData = useDataFetch(iyzicoServices.initiatePayment);
    const getShippingMethodByVariant = useDataFetch(shippingServices.getShippingMethodByVariantId);

    useEffect(() => {
        if (effectiveItems.length === 0) return;
        // Drop the previous quote so a stale rate can never be charged for a new country.
        setShippingMethods({});
        const requestedFor = destinationCountry;
        for (const item of effectiveItems) {
            getShippingMethodByVariant.request(item.productVariantId, destinationCountry).onSuccess((shippingMethod) => {
                if (destCountryRef.current !== requestedFor) return;
                setShippingMethods((prev) => ({
                    ...prev,
                    [item.cartItemId]: shippingMethod,
                }));
            });
        }
    }, [effectiveItems, destinationCountry]);

    const handlePaymentSubmit = useCallback(
        (payload: PaymentInitiateRequest) => {
            initiatePaymentData
                .request(payload)
                .onSuccess((response: PaymentInitiateResponse) => {
                    if (response.htmlContent) {
                        // Show the 3DS iframe modal
                        setThreeDSHtml(response.htmlContent);
                    } else {
                        toast.error("Could not initiate payment. Please try again.");
                    }
                })
                .onError((error: string) => {
                    toast.error(error || "Payment initiation failed. Please check your card details and try again.");
                    console.error("Payment initiation error:", error);
                });
        },
        [initiatePaymentData]
    );

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="container mx-auto">
                <CheckoutForm
                    cartItems={effectiveItems}
                    subtotalAmount={effectiveTotal}
                    shippingMethods={shippingMethods}
                    loading={initiatePaymentData.isLoading}
                    onSubmit={handlePaymentSubmit}
                    currentAddress={user?.address}
                    isAuthenticated={authenticated}
                    onDestinationCountryChange={setDestinationCountry}
                />
            </div>

            {/* 3DS iframe modal — shown after iyzico returns HTML */}
            {threeDSHtml && (
                <ThreeDSModal
                    htmlContent={threeDSHtml}
                    onClose={() => {
                        setThreeDSHtml(null);
                        toast.info("Payment cancelled.");
                    }}
                />
            )}
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
            </div>
        }>
            <CheckoutPageInner />
        </Suspense>
    );
}
