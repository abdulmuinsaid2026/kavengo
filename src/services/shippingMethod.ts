import servicesApiClient from "@/lib/services-api-client";
import { ServiceFunction } from "@/types/api";
import { ShippingMethod, ShippingMethodDTO } from "@/types/domains/shipping_method";

export const createShippingMethod: ServiceFunction<ShippingMethodDTO, ShippingMethod> = (shippingMethodDto) => {
    return servicesApiClient.post('/shipping-methods', { data: shippingMethodDto });
};

export const getAllShippingMethods: ServiceFunction<[], ShippingMethod[]> = async () => {
    return servicesApiClient.get(`/shipping-methods`);
};

export const updateShippingMethod: ServiceFunction<[shippingMethodId: number, shippingMethodDto: ShippingMethodDTO], ShippingMethod> = (shippingMethodId, shippingMethodDto) => {
    return servicesApiClient.put(`/shipping-methods/${shippingMethodId}`, { data: shippingMethodDto });
};

export const deleteShippingMethod: ServiceFunction<[shippingMethodId: number], void> = (shippingMethodId) => {
    return servicesApiClient.delete(`/shipping-methods/${shippingMethodId}`);
};

export const getShippingMethodByVariantId: ServiceFunction<
    [productVariantId: number, destinationCountry?: string],
    ShippingMethod
> = (productVariantId, destinationCountry) => {
    const query = destinationCountry
        ? `?country=${encodeURIComponent(destinationCountry)}`
        : "";
    return servicesApiClient.get(`/shipping-methods/by-variant/${productVariantId}${query}`);
};