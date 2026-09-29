/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CategoryDetails, CategoryTree } from "@/types/domains/category";
import { CategoryDTO } from "@/types/domains/category";
import { Variation, VariationOption } from "@/types/domains/variation";
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Attribute, AttributeType } from "@/types/domains/attribute";
import { ShippingMethod } from "@/types/domains/shipping_method";
import { extractConsonants } from "@/lib/utils";
import Spinner from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { RequestFunction } from "@/hooks/use-data-fetch";
import CategoriesDropdown from "@/app/components/CategoriesDropdown";
import { ProductDetails } from "@/types/domains/product";
import useDrivePicker from "react-google-drive-picker";
import Image from "next/image";
import { ClipboardPaste, ChevronsDown, Plus, Trash2, Upload, X } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AddCategoryForm from "@/app/(settings)/admin/categories/components/AddCategoryForm";
import useDataFetch from "@/hooks/use-data-fetch";
import * as categoryServices from "@/services/category";
import { useAppDispatch } from "@/store/hooks";
import { fetchCategories } from "@/store/slices/categorySlice";
import { useRouter } from "next/navigation";

const productFormSchema = z
   .object({
      title: z.string().nonempty("Title is required."),
      code: z.string().nonempty("Code is required."),
      description: z.string().nonempty("Description is required."),
      starred: z.boolean(),
      status: z.boolean(),
      categoryId: z.number().gt(0, "Category is required."),
      shippingMethodId: z.number().gt(0, "Shipping method is required."),
      images: z.array(
         z.object({
            productImageId: z.number().optional(),
            imageUrl: z.string().min(1, "Image is required"),
            isDefault: z.boolean(),
         })
      ),
      variants: z.array(
         z.object({
            productVariantId: z.number().optional(),
            sku: z.string().nonempty("SKU is required."),
            quantityInStock: z.number(),
            price: z.number(),
            disabled: z.boolean(),
            variationOptionIds: z.array(z.number().gt(0, "Please select an option.")).min(1, "At least one variation option is required."),
         })
      ),
      attributes: z.array(
         z.object({
            attributeId: z.number().gt(0, "Please select an attribute."),
            value: z.string().nonempty("Value is required."),
         })
      ),
   })
   .refine((data) => data.variants.length > 0, { message: "At least one variant is required." })
   .refine(
      (data) => {
         const keys = data.variants.map((v) => v.variationOptionIds.join("-"));
         return new Set(keys).size === keys.length;
      },
      { message: "Duplicate variants are not allowed." }
   );

type ProductFormData = z.infer<typeof productFormSchema>;

function assignField<T extends keyof ProductFormData>(field: T, target: Partial<ProductFormData>, value: ProductFormData[T]) {
   target[field] = value;
}

interface CategoryData {
   categoryId: number;
   name: string;
   code: string;
   parentCategory: CategoryData | undefined;
   variationIds: number[];
   attributeIds: number[];
}

const categoryDetailsMap = new Map<number, CategoryData>();

export default function ProductForm({
   mode = "create",
   product,
   copiedProduct,
   categories,
   variations,
   attributes,
   shippingMethods,
   loading,
   categoriesLoading,
   shippingMethodsLoading,
   fetchCategoryDetails,
   onSubmit,
}: {
   mode?: "create" | "update";
   product?: ProductDetails;
   copiedProduct?: ProductDetails;
   categories: CategoryTree[];
   variations: Variation[];
   attributes: Attribute[];
   shippingMethods: ShippingMethod[];
   loading: boolean;
   categoriesLoading: boolean;
   shippingMethodsLoading: boolean;
   fetchCategoryDetails: RequestFunction<[categoryId: number], CategoryDetails>;
   onSubmit: (data: Partial<ProductFormData>) => void;
}) {
   const dispatch = useAppDispatch();
   const router = useRouter();
   const [openPicker, authResponse] = useDrivePicker();
   const addCategoryDialogRef = React.useRef<{ open: () => void; close: () => void }>(null);
   const [categoryDialogParent, setCategoryDialogParent] = useState<CategoryData | null>(null);
   const createCategory = useDataFetch(categoryServices.createCategory);
   const fileInputRef = useRef<HTMLInputElement>(null);
   const productForm = useForm({
      resolver: zodResolver(productFormSchema),
      defaultValues: {
         title: "",
         code: "",
         description: "",
         starred: false,
         status: true,
         shippingMethodId: 0,
         images: [],
         variants: [],
         attributes: [],
      },
   });
   const {
      fields: productVariants,
      replace: replaceVariants,
      remove: removeVariantAt,
      append: appendVariant,
      update: updateVariant,
   } = useFieldArray({ control: productForm.control, name: "variants" });

   const variantTableRef = useRef<HTMLDivElement>(null);
   const rowVirtualizer = useVirtualizer({
      count: productVariants.length,
      getScrollElement: () => variantTableRef.current,
      estimateSize: () => 57,
      overscan: 5,
   });
   const prevVariantCountRef = useRef(productVariants.length);

   const firstRender = useRef(true);
   const [pasteApplied, setPasteApplied] = useState(false);
   // In update mode the form is empty until product + category details both load.
   // Track readiness so we can show skeletons instead of flashing empty state.
   const [formPopulated, setFormPopulated] = useState(mode !== "update");

   // If user copied a new product, allow pasting again (don't get stuck hidden).
   useEffect(() => {
      if (mode === "create") setPasteApplied(false);
   }, [mode, copiedProduct?.productId]);

   const applyPastedProduct = useCallback((source: ProductDetails) => {
      const rawCategoryId = (source as unknown as { categoryId?: unknown })?.categoryId;
      const categoryId = typeof rawCategoryId === "number"
         ? rawCategoryId
         : typeof rawCategoryId === "string"
            ? Number(rawCategoryId)
            : NaN;
      if (!Number.isFinite(categoryId) || categoryId <= 0) {
         toast.error("Copied product is missing a valid category. Please select a category and try again.");
         return;
      }

      fetchCategoryDetails(categoryId).onSuccess((categoryDetails) => {
         registerCategoryDetails(categoryDetails);

         // Keep paste logic minimal & predictable.
         // We only use fields that are part of the backend response contract.
         const images = (source.images || [])
            .map((img) => ({
               imageUrl: img.imageUrl ?? "",
               isDefault: Boolean(img.isDefault),
            }))
            .filter((img) => Boolean(img.imageUrl));
         if (images.length > 0 && !images.some((i) => i.isDefault)) images[0].isDefault = true;

         productForm.reset({
            title: source.title ?? "",
            code: source.code ?? "",
            description: source.description ?? "",
            starred: source.starred ?? false,
            status: source.status !== false,
            categoryId,
            shippingMethodId: source.shippingMethodId || 0,
            images,
            variants: (source.variants || []).map((v) => ({
               variationOptionIds: Object.values(v.variantProperties || {}).map((opt) => opt.variationOptionId),
               sku: v.sku,
               quantityInStock: v.quantityInStock,
               price: v.price,
               disabled: v.disabled,
            })),
            attributes: (source.attributes || [])
               .map((a) => ({
                  attributeId: a.attribute?.attributeId,
                  value: a.value ?? "",
               }))
               .filter((a) => typeof a.attributeId === "number"),
         });
         // Mark form dirty so the submit button activates
         productForm.setValue("title", source.title, { shouldDirty: true });
         productForm.trigger();
         setPasteApplied(true);
         toast.success("Product details pasted!");
      });
   }, [fetchCategoryDetails, productForm]);

   useEffect(() => {
      if (!firstRender.current && product) {
         if (typeof product.categoryId !== "number" || !Number.isFinite(product.categoryId) || product.categoryId <= 0) {
            toast.error("Product is missing a valid categoryId.");
            return;
         }

         fetchCategoryDetails(product.categoryId).onSuccess((categoryDetails) => {
            registerCategoryDetails(categoryDetails);
            productForm.reset({
               title: product.title,
               code: product.code,
               description: product.description,
               starred: product.starred ?? false,
               status: product.status !== false,
               categoryId: product.categoryId,
               shippingMethodId: product.shippingMethodId || 0,
               images: product.images || [],
               variants: (product.variants || []).map((v) => ({
                  ...v,
                  variationOptionIds: Object.values(v.variantProperties || {}).map((opt) => opt.variationOptionId),
               })),
               attributes: (product.attributes || []).map((a) => ({
                  attributeId: a.attribute?.attributeId,
                  value: a.value ?? "",
               })).filter((a) => typeof a.attributeId === "number"),
            });
            setFormPopulated(true);
         });
         return;
      }
      firstRender.current = false;
   }, [product]);

   useEffect(() => {
      const prev = prevVariantCountRef.current;
      prevVariantCountRef.current = productVariants.length;
      if (productVariants.length === prev + 1) {
         rowVirtualizer.scrollToIndex(productVariants.length - 1, { behavior: "smooth" });
      }
   }, [productVariants.length]);

   const indexedVariations = useMemo(
      () =>
         variations.reduce((acc, variation) => {
            acc[variation.variationId] = variation;
            return acc;
         }, {} as Record<number, (typeof variations)[number]>),
      [variations]
   );
   const indexedVariationOptions = useMemo(
      () =>
         variations.reduce((acc, variation) => {
            variation.variationOptions.forEach((opt) => (acc[opt.variationOptionId] = opt));
            return acc;
         }, {} as Record<number, VariationOption>),
      [variations]
   );
   const indexedAttributes = useMemo(
      () =>
         attributes.reduce((acc, attribute) => {
            acc[attribute.attributeId] = attribute;
            return acc;
         }, {} as Record<number, (typeof attributes)[number]>),
      [attributes]
   );

   const selectedCategoryDetails = categoryDetailsMap.get(productForm.watch("categoryId"));
   const categoryVariationIds = useMemo(() => {
      const categoryVariationIdSet: Set<number> = new Set();
      let current = selectedCategoryDetails;
      while (current) {
         current.variationIds.forEach((vId) => categoryVariationIdSet.add(vId));
         current = current.parentCategory;
      }
      return Array.from(categoryVariationIdSet)
         .filter((vId) => indexedVariations[vId])
         .sort();
   }, [selectedCategoryDetails, indexedVariations]);
   const productAttributes = productForm.watch("attributes");
   const productImages = productForm.watch("images");

   const updateSkus = useCallback(
      (productCode: string) => {
         const currentVariants = productForm.getValues("variants");
         currentVariants.forEach((v, i) =>
            productForm.setValue(
               `variants.${i}.sku`,
               `${selectedCategoryDetails?.code || ""}-${productCode}-${v.variationOptionIds
                  .filter((optId) => optId > 0)
                  .map((optId) => indexedVariationOptions[optId]?.code)
                  .filter(Boolean)
                  .join("-")}`
            )
         );
      },
      [productForm, selectedCategoryDetails, indexedVariationOptions]
   );

   const computeSku = useCallback(
      (variationOptionIds: number[]) => {
         const productCode = productForm.getValues("code") || "";
         return `${selectedCategoryDetails?.code || ""}-${productCode}-${variationOptionIds
            .filter((optId) => optId > 0)
            .map((optId) => indexedVariationOptions[optId]?.code)
            .filter(Boolean)
            .join("-")}`;
      },
      [indexedVariationOptions, productForm, selectedCategoryDetails]
   );

   const updateVariantsAndAttributes = useCallback(
      (categoryDetails: CategoryData) => {
          const variants = getVariantsFromVariations(
             getCategoryVariations(categoryDetails)
                .map((vId) => indexedVariations[vId])
                .filter((v): v is Variation => Boolean(v))
          );
         const productCode = productForm.getValues("code");
         variants.forEach(
            (v) =>
            (v.sku = `${categoryDetails.code}-${productCode}-${v.variationOptionIds
               .filter((optId) => optId > 0)
               .map((optId) => indexedVariationOptions[optId]?.code)
               .filter(Boolean)
               .join("-")}`)
         );
         replaceVariants(variants);
         productForm.setValue(
            "attributes",
            getCategoryAttributes(categoryDetails).map((aId) => ({
               attributeId: aId,
               value: "",
            }))
         );
      },
      [productForm, replaceVariants, indexedVariations, indexedVariationOptions]
   );

   const addAttributeRow = useCallback(() => {
      productForm.setValue(
         "attributes",
         [...productForm.getValues("attributes"), { attributeId: 0, value: "" }],
         { shouldDirty: true }
      );
   }, [productForm]);

   const removeAttributeRow = useCallback(
      (index: number) => {
         const next = [...productForm.getValues("attributes")];
         next.splice(index, 1);
         productForm.setValue("attributes", next, { shouldDirty: true });
      },
      [productForm]
   );

   const addEmptyVariantRow = useCallback(() => {
      if (!selectedCategoryDetails) {
         toast.error("Please select a category first.");
         return;
      }
      const variationIds = getCategoryVariations(selectedCategoryDetails);
      if (!variationIds.length) {
         toast.error("Selected category has no variations.");
         return;
      }
      appendVariant({
         sku: computeSku(variationIds.map(() => 0)),
         price: 0,
         quantityInStock: 0,
         disabled: false,
         variationOptionIds: variationIds.map(() => 0),
      });
   }, [computeSku, appendVariant, selectedCategoryDetails]);

   const removeVariantRow = useCallback(
      (index: number) => {
         removeVariantAt(index);
      },
      [removeVariantAt]
   );

   const scrollToVariantBottom = useCallback(() => {
      if (productVariants.length > 0) {
         rowVirtualizer.scrollToIndex(productVariants.length - 1, { behavior: "smooth" });
      }
   }, [rowVirtualizer, productVariants.length]);

   const handleOpenPicker = useCallback(() => {
      try {
         openPicker({
            clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
            developerKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY!,
            token: authResponse?.access_token,
            viewId: "DOCS_IMAGES",
            multiselect: false,
            supportDrives: true,
            viewMimeTypes: "image/png,image/jpeg,image/jpg,image/gif,image/webp",

            callbackFunction(data) {
               if (!(data.action === "picked" && data.docs && data.docs.length > 0)) return;

               const file = data.docs[0];
               const fileId = file.id;
               const imageUrl = `https://drive.google.com/uc?id=${fileId}&export=view`;
               if (productImages.some((img) => img.imageUrl === imageUrl)) return;

               productForm.setValue(
                  "images",
                  [
                     ...productImages,
                     {
                        imageUrl,
                        isDefault: productImages.length === 0,
                     },
                  ],
                  { shouldDirty: true }
               );
            },
         });
      } catch {
         toast.error("Failed to open Google Drive picker. Please try again.");
      }
   }, [openPicker, authResponse, productImages, productForm]);

   const [isUploading, setIsUploading] = useState(false);

   const handleDeviceUpload = useCallback(
      async (e: React.ChangeEvent<HTMLInputElement>) => {
         const file = e.target.files?.[0];
         if (!file) return;

         // Reset so same file can be re-selected
         e.target.value = "";

         setIsUploading(true);
         try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch("/api/upload", {
               method: "POST",
               body: formData,
            });

            if (!res.ok) throw new Error("Upload failed");

            const { url: imageUrl } = await res.json();
            if (!imageUrl?.startsWith("http")) throw new Error("Invalid response");

            if (productImages.some((img) => img.imageUrl === imageUrl)) {
               toast.info("This image is already added.");
               return;
            }

            productForm.setValue(
               "images",
               [
                  ...productImages,
                  {
                     imageUrl,
                     isDefault: productImages.length === 0,
                  },
               ],
               { shouldDirty: true }
            );
            toast.success("Image uploaded successfully!");
         } catch {
            toast.error("Failed to upload image. Please try again.");
         } finally {
            setIsUploading(false);
         }
      },
      [productImages, productForm]
   );


   const removeImage = useCallback(
      (imageUrl: string) => {
         const indexToRemove = productImages.findIndex((img) => img.imageUrl === imageUrl);
         const updatedImages = [...productImages];
         if (indexToRemove !== -1) {
            const [removedImage] = updatedImages.splice(indexToRemove, 1);
            if (removedImage.isDefault && updatedImages.length > 0) updatedImages[0].isDefault = true;
            productForm.setValue("images", updatedImages, { shouldDirty: true });
         }
      },
      [productForm, productImages]
   );

   const setAsDefault = useCallback(
      (imageUrl: string) => {
         const updatedImages = productImages.map((img) => ({
            ...img,
            isDefault: img.imageUrl === imageUrl,
         }));
         productForm.setValue("images", updatedImages, { shouldDirty: true });
      },
      [productForm, productImages]
   );

   return (
      <>
         <Form {...productForm}>
         {/* Paste Banner — only in create mode when a copied product exists */}
         {mode === "create" && copiedProduct && !pasteApplied && (
            <div className="flex items-center gap-3 rounded-lg border px-4 py-3  mb-4">
               <ClipboardPaste className="h-4 w-4 shrink-0 text-muted-foreground" />
               <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-none truncate">
                     Clipboard: &ldquo;{copiedProduct.title}&rdquo;
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                     Product details are ready to paste
                  </p>
               </div>
               <div className="flex items-center gap-2 shrink-0">
                  <Button
                     type="button"
                     size="sm"
                     onClick={() => applyPastedProduct(copiedProduct)}
                  >
                     <ClipboardPaste className="h-3.5 w-3.5" />
                     Paste
                  </Button>
                  <Button
                     type="button"
                     variant="ghost"
                     size="icon"
                     className="h-8 w-8 text-muted-foreground"
                     onClick={() => setPasteApplied(true)}
                  >
                     <X className="h-4 w-4" />
                  </Button>
               </div>
            </div>
         )}
         <form
            onSubmit={productForm.handleSubmit((data) => {
               // In create mode we must submit the full form values.
               // In update mode we submit only dirty fields to avoid overwriting unchanged data.
               if (mode === "create") {
                  onSubmit(data);
                  return;
               }

               const dataToSubmit: Partial<ProductFormData> = {};
               const dirtyFields = productForm.formState.dirtyFields;
               const dirtyFieldKeys = Object.keys(dirtyFields) as (keyof ProductFormData)[];
               if (dirtyFieldKeys.length === 0) return;

               dirtyFieldKeys.forEach((key) => {
                  if (dirtyFields[key]) assignField(key, dataToSubmit, data[key]);
               });

               onSubmit(dataToSubmit);
            })}
            className="space-y-8"
         >
            {!formPopulated ? (
               <div className="space-y-6">
                  {/* Images skeleton */}
                  <div className="space-y-4">
                     <Skeleton className="h-4 w-28" />
                     <Skeleton className="h-72 w-full rounded-md" />
                  </div>

                  {/* Title + Code skeleton */}
                  <div className="flex flex-col md:flex-row gap-6 md:gap-4">
                     <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-9 w-full" />
                     </div>
                     <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-9 w-full" />
                     </div>
                  </div>

                  {/* Description skeleton */}
                  <div className="space-y-2">
                     <Skeleton className="h-4 w-24" />
                     <Skeleton className="h-24 w-full" />
                  </div>

                  {/* Category / Shipping / Starred / Active skeleton */}
                  <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-4">
                     <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-9 w-full" />
                     </div>
                     <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-9 w-full" />
                     </div>
                     <div className="lg:flex-1 space-y-3">
                        <Skeleton className="h-4 w-16" />
                        <div className="flex items-center gap-2">
                           <Skeleton className="h-4 w-4 rounded-sm" />
                           <Skeleton className="h-4 w-52" />
                        </div>
                     </div>
                     <div className="lg:flex-1 space-y-3">
                        <Skeleton className="h-4 w-12" />
                        <div className="flex items-center gap-2">
                           <Skeleton className="h-4 w-4 rounded-sm" />
                           <Skeleton className="h-4 w-52" />
                        </div>
                     </div>
                  </div>

                  <Separator />

                  {/* Variants skeleton */}
                  <div className="space-y-4">
                     <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-8 w-28 rounded-md" />
                     </div>
                     <div className="border rounded-md overflow-hidden">
                        <div className="flex gap-3 p-3 border-b bg-muted/40">
                           {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-4 flex-1" />)}
                        </div>
                        {Array.from({ length: 3 }).map((_, i) => (
                           <div key={i} className="flex gap-3 p-3 border-b last:border-b-0">
                              {Array.from({ length: 6 }).map((_, j) => <Skeleton key={j} className="h-9 flex-1" />)}
                           </div>
                        ))}
                     </div>
                  </div>

                  <Separator />

                  {/* Attributes skeleton */}
                  <div className="space-y-4">
                     <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-8 w-28 rounded-md" />
                     </div>
                     <div className="space-y-3">
                        {Array.from({ length: 2 }).map((_, i) => (
                           <div key={i} className="flex gap-3">
                              <Skeleton className="h-9 flex-1" />
                              <Skeleton className="h-9 flex-1" />
                              <Skeleton className="h-9 w-8" />
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            ) : (
            <div className="space-y-6">
               <div className="space-y-4">
                  <Label>Product Images</Label>

                  <div className="h-72 flex gap-4">
                     {productImages.length > 0 && (
                        <div className="flex-1 overflow-x-auto thin-scrollbar flex gap-4">
                           {productImages.map((image, index) => (
                              <div
                                 key={image.imageUrl}
                                 className="relative cursor-pointer"
                                 onClick={() => setAsDefault(image.imageUrl)}
                              >
                                 <Image
                                    src={image.imageUrl}
                                    alt={`Product image ${index + 1}`}
                                    width={100}
                                    height={100}
                                    style={{ maxWidth: "none" }}
                                    className={`w-auto h-full object-cover rounded-md transition-all duration-300 ${image.isDefault
                                          ? "outline outline-[3px] outline-green-500 outline-offset-[-3px]"
                                          : "outline-none"
                                       }`}
                                    onError={(e) => {
                                       (e.target as HTMLImageElement).src = "/placeholder-image.jpeg";
                                    }}
                                 />
                                 <span
                                    className={`
                                        absolute top-3 left-3
                                        bg-green-800 text-white px-2 py-1 rounded-md text-xs
                                        transition-opacity transition-transform duration-300
                                        ${image.isDefault ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"}
                                    `}
                                 >
                                    Default
                                 </span>
                                 <Button
                                    className="absolute top-3 right-3"
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                       e.stopPropagation();
                                       removeImage(image.imageUrl);
                                    }}
                                    disabled={loading}
                                 >
                                    <Trash2 />
                                 </Button>
                              </div>
                           ))}
                        </div>
                     )}
                     {productImages.length < 10 && (
                        <div className="flex flex-col gap-3 min-w-64">
                           {/* Hidden file input */}
                           <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                              className="hidden"
                              onChange={handleDeviceUpload}
                           />

                           {/* Upload from Device button */}
                           <div
                              className={`border bg-accent rounded-md flex-1 flex flex-col justify-center items-center gap-2 cursor-pointer transition-opacity ${loading || isUploading ? "opacity-50 pointer-events-none" : "hover:bg-accent/80"
                                 }`}
                              onClick={() => !isUploading && fileInputRef.current?.click()}
                           >
                              {isUploading ? (
                                 <>
                                    <Spinner />
                                    <p className="text-sm text-muted-foreground">Uploading...</p>
                                 </>
                              ) : (
                                 <>
                                    <Upload className="size-8 text-muted-foreground" />
                                    <p className="text-sm text-muted-foreground">Upload from Device</p>
                                 </>
                              )}
                           </div>

                           {/* Google Drive button */}
                           <div
                              className={`border bg-accent rounded-md flex-1 flex flex-col justify-center items-center gap-2 cursor-pointer transition-opacity ${loading ? "opacity-50 pointer-events-none" : "hover:bg-accent/80"
                                 }`}
                              onClick={loading ? undefined : handleOpenPicker}
                           >
                              <Plus className="size-8 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">Select from Google Drive</p>
                           </div>
                        </div>
                     )}
                  </div>
               </div>

               <div className="flex flex-col md:flex-row gap-6 md:gap-4">
                  <FormField
                     disabled={loading}
                     control={productForm.control}
                     name="title"
                     render={({ field }) => (
                        <FormItem className="flex-1">
                           <FormLabel>Product Title</FormLabel>
                           <FormControl>
                              <Input
                                 placeholder="Enter product title"
                                 {...field}
                                 onChange={(e) => {
                                    const newValue = e.target.value;
                                    field.onChange(newValue);
                                    productForm.setValue("code", extractConsonants(newValue).toUpperCase(), {
                                       shouldDirty: true,
                                    });
                                 }}
                                 onBlur={(e) => {
                                    field.onBlur();
                                    const trimmedValue = e.target.value.trim();
                                    field.onChange(trimmedValue);
                                    updateSkus(extractConsonants(trimmedValue).toUpperCase());
                                 }}
                              />
                           </FormControl>
                           <FormMessage />
                        </FormItem>
                     )}
                  />
                  <FormField
                     disabled={loading}
                     control={productForm.control}
                     name="code"
                     render={({ field }) => (
                        <FormItem className="flex-1">
                           <FormLabel>Product Code</FormLabel>
                           <FormControl>
                              <Input
                                 placeholder="Enter product code"
                                 {...field}
                                 onBlur={(e) => {
                                    field.onBlur();
                                    const formatted = e.target.value.trim().toUpperCase().replace(/\s+/g, "-");
                                    field.onChange(formatted);
                                    updateSkus(formatted);
                                 }}
                              />
                           </FormControl>
                           <FormMessage />
                        </FormItem>
                     )}
                  />
               </div>

               <FormField
                  disabled={loading}
                  control={productForm.control}
                  name="description"
                  render={({ field }) => (
                     <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                           <Textarea
                              placeholder="Enter product description"
                              className="min-h-[100px]"
                              {...field}
                              onBlur={(e) => {
                                 field.onBlur();
                                 field.onChange(e.target.value.trim());
                              }}
                           />
                        </FormControl>
                        <FormMessage />
                     </FormItem>
                  )}
               />

               <div className="flex flex-col lg:flex-row lg:items-start gap-6 lg:gap-4">
                  <FormField
                     control={productForm.control}
                     name="categoryId"
                     disabled={loading || categoriesLoading}
                     render={({ field }) => {
                        return (
                           <FormItem className="min-w-xs flex-1">
                              <FormLabel>Category</FormLabel>
                              <FormControl>
                                 <CategoriesDropdown
                                    categories={categories}
                                    disabled={field.disabled}
                                    selectedCategoryNode={categoryDetailsMap.get(field.value)}
                                    onAddCategory={() => {
                                       setCategoryDialogParent(null);
                                       addCategoryDialogRef.current?.open();
                                    }}
                                    onAddSubcategory={(parentNode) => {
                                       fetchCategoryDetails(parentNode.categoryId).onSuccess((res) => {
                                          const details = registerCategoryDetails(res);
                                          setCategoryDialogParent(details);
                                          addCategoryDialogRef.current?.open();
                                       });
                                    }}
                                    onSelect={(node) => {
                                       fetchCategoryDetails(node.categoryId).onSuccess((res) => {
                                          field.onChange(node.categoryId);
                                          updateVariantsAndAttributes(registerCategoryDetails(res));
                                       });
                                    }}
                                 />
                              </FormControl>
                              <FormMessage />
                           </FormItem>
                        );
                     }}
                  />

                  <FormField
                     control={productForm.control}
                     name="shippingMethodId"
                     disabled={loading || shippingMethodsLoading}
                     render={({ field }) => (
                        <FormItem className="min-w-xs flex-1">
                           <FormLabel>Shipping Method</FormLabel>
                           <FormControl>
                              <Select
                                 disabled={field.disabled}
                                 value={field.value ? field.value.toString() : ""}
                                 onValueChange={(value) => field.onChange(parseInt(value))}
                              >
                                 <SelectTrigger>
                                    <SelectValue placeholder="Select shipping method" />
                                 </SelectTrigger>
                                 <SelectContent>
                                    {shippingMethods.map((method) => (
                                       <SelectItem key={method.shippingMethodId} value={method.shippingMethodId.toString()}>
                                          <div className="flex flex-col items-start text-left w-full">
                                             <span className="font-medium text-left">{method.name}</span>
                                             <span className="text-xs text-muted-foreground text-left">
                                                {method.originCountry} • {method.processingTimeMin}-{method.processingTimeMax} days processing
                                             </span>
                                          </div>
                                       </SelectItem>
                                    ))}
                                 </SelectContent>
                              </Select>
                           </FormControl>
                           <FormMessage />
                        </FormItem>
                     )}
                  />

                  <FormField
                     disabled={loading}
                     control={productForm.control}
                     name="starred"
                     render={({ field }) => (
                        <FormItem className="lg:flex-1 gap-3">
                           <FormLabel>Starred</FormLabel>
                           <FormControl>
                              <div className="flex items-center gap-2">
                                 <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                 <label className="text-sm text-muted-foreground">
                                    Check if you want this product to appear on top.
                                 </label>
                              </div>
                           </FormControl>
                           <FormMessage />
                        </FormItem>
                     )}
                  />

                  <FormField
                     disabled={loading}
                     control={productForm.control}
                     name="status"
                     render={({ field }) => (
                        <FormItem className="lg:flex-1 gap-3">
                           <FormLabel>Active</FormLabel>
                           <FormControl>
                              <div className="flex items-center gap-2">
                                 <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                 <label className="text-sm text-muted-foreground">
                                    Visible on the shop. Uncheck to hide without deleting.
                                 </label>
                              </div>
                           </FormControl>
                           <FormMessage />
                        </FormItem>
                     )}
                  />
               </div>

               <Separator />

               <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                     <div className="flex items-center gap-2">
                        <Label>Product Variants</Label>
                        {productVariants.length > 0 && (
                           <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                              {productVariants.length.toLocaleString()} total
                           </span>
                        )}
                     </div>
                     <div className="flex items-center gap-2">
                        {productVariants.length > 10 && (
                           <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={scrollToVariantBottom}
                           >
                              <ChevronsDown className="h-4 w-4" />
                              Jump to bottom
                           </Button>
                        )}
                        <Button
                           type="button"
                           variant="outline"
                           size="sm"
                           disabled={loading || !categoryVariationIds.length}
                           onClick={addEmptyVariantRow}
                        >
                           <Plus className="h-4 w-4" />
                           Add Variant
                        </Button>
                     </div>
                  </div>
                  {categoryVariationIds.length ? (
                     <div
                        ref={variantTableRef}
                        className="relative w-full overflow-auto border rounded-md"
                        style={{ maxHeight: "560px" }}
                     >
                        <Table className="border-separate border-spacing-0">
                           <TableHeader className="sticky top-0 z-10 bg-background shadow-[inset_0_-1px_0_0_hsl(var(--border))]">
                              <TableRow>
                                 <TableHead className="w-12">#</TableHead>
                                  {categoryVariationIds.map((vId) => (
                                     <TableHead key={vId} className="min-w-36">
                                        {indexedVariations[vId]?.name}
                                     </TableHead>
                                  ))}
                                 <TableHead className="min-w-44">SKU</TableHead>
                                 <TableHead className="min-w-28">Price</TableHead>
                                 <TableHead className="min-w-28">Stock</TableHead>
                                 <TableHead className="min-w-24">Disabled</TableHead>
                                 <TableHead className="w-10"></TableHead>
                              </TableRow>
                           </TableHeader>
                           <TableBody>
                              {/* Top spacer — fills the scroll space above the first visible row */}
                              {(() => {
                                 const items = rowVirtualizer.getVirtualItems();
                                 const paddingTop = items.length > 0 ? items[0].start : 0;
                                 return paddingTop > 0 ? (
                                    <TableRow style={{ height: paddingTop }}>
                                       <TableCell colSpan={categoryVariationIds.length + 6} style={{ padding: 0, border: "none" }} />
                                    </TableRow>
                                 ) : null;
                              })()}
                              {/* Only the ~10 visible rows are rendered */}
                              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                                 const variant = productVariants[virtualRow.index];
                                 const index = virtualRow.index;
                                 return (
                                    <TableRow key={variant.id}>
                                       <TableCell className="text-muted-foreground text-xs tabular-nums w-12">{index + 1}</TableCell>
                                       {categoryVariationIds.map((variationId, colIndex) => {
                                          const currentOptId = variant.variationOptionIds?.[colIndex] ?? 0;
                                          const options = indexedVariations[variationId]?.variationOptions || [];
                                          return (
                                             <TableCell key={`${variationId}-${colIndex}`}>
                                                <Select
                                                   disabled={loading}
                                                   value={currentOptId ? String(currentOptId) : ""}
                                                   onValueChange={(value) => {
                                                      const nextOptId = Number(value);
                                                      const nextVariant = { ...productForm.getValues(`variants.${index}`) };
                                                      const nextOptionIds = [...(nextVariant.variationOptionIds || [])];
                                                      while (nextOptionIds.length < categoryVariationIds.length) nextOptionIds.push(0);
                                                      nextOptionIds[colIndex] = nextOptId;
                                                      nextVariant.variationOptionIds = nextOptionIds;
                                                      nextVariant.sku = computeSku(nextOptionIds);
                                                      updateVariant(index, nextVariant as ProductFormData["variants"][number]);
                                                   }}
                                                >
                                                   <SelectTrigger className="min-w-36">
                                                      <SelectValue placeholder="Select" />
                                                   </SelectTrigger>
                                                   <SelectContent>
                                                      {options.map((o) => (
                                                         <SelectItem key={o.variationOptionId} value={String(o.variationOptionId)}>
                                                            {o.name}
                                                         </SelectItem>
                                                      ))}
                                                   </SelectContent>
                                                </Select>
                                             </TableCell>
                                          );
                                       })}
                                       <TableCell>
                                          <FormField
                                             disabled={loading}
                                             control={productForm.control}
                                             name={`variants.${index}.sku`}
                                             render={({ field }) => (
                                                <FormItem>
                                                   <FormControl>
                                                      <Input
                                                         {...field}
                                                         onBlur={(e) => {
                                                            field.onBlur();
                                                            field.onChange(e.target.value.trim());
                                                         }}
                                                      />
                                                   </FormControl>
                                                   <FormMessage />
                                                </FormItem>
                                             )}
                                          />
                                       </TableCell>
                                       <TableCell>
                                          <FormField
                                             disabled={loading}
                                             control={productForm.control}
                                             name={`variants.${index}.price`}
                                             render={({ field }) => (
                                                <FormItem>
                                                   <FormControl>
                                                      <Input
                                                         type="number"
                                                         {...field}
                                                         onFocus={(e) => e.target.select()}
                                                         onChange={(e) => {
                                                            const value = e.target.value;
                                                            field.onChange(value === "" ? "" : parseFloat(value));
                                                         }}
                                                      />
                                                   </FormControl>
                                                   <FormMessage />
                                                </FormItem>
                                             )}
                                          />
                                       </TableCell>
                                       <TableCell>
                                          <FormField
                                             disabled={loading}
                                             control={productForm.control}
                                             name={`variants.${index}.quantityInStock`}
                                             render={({ field }) => (
                                                <FormItem>
                                                   <FormControl>
                                                      <Input
                                                         type="number"
                                                         {...field}
                                                         onFocus={(e) => e.target.select()}
                                                         onChange={(e) => {
                                                            const value = e.target.value;
                                                            field.onChange(value === "" ? "" : parseFloat(value));
                                                         }}
                                                      />
                                                   </FormControl>
                                                   <FormMessage />
                                                </FormItem>
                                             )}
                                          />
                                       </TableCell>
                                       <TableCell>
                                          <FormField
                                             disabled={loading}
                                             control={productForm.control}
                                             name={`variants.${index}.disabled`}
                                             render={({ field }) => (
                                                <FormItem>
                                                   <FormControl>
                                                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                                   </FormControl>
                                                </FormItem>
                                             )}
                                          />
                                       </TableCell>
                                       <TableCell>
                                          <Button
                                             type="button"
                                             variant="ghost"
                                             size="icon"
                                             className="h-8 w-8"
                                             disabled={loading}
                                             onClick={() => removeVariantRow(index)}
                                          >
                                             <Trash2 className="h-4 w-4" />
                                          </Button>
                                       </TableCell>
                                    </TableRow>
                                 );
                              })}
                              {/* Bottom spacer — fills the scroll space below the last visible row */}
                              {(() => {
                                 const items = rowVirtualizer.getVirtualItems();
                                 const paddingBottom = items.length > 0
                                    ? rowVirtualizer.getTotalSize() - items[items.length - 1].end
                                    : 0;
                                 return paddingBottom > 0 ? (
                                    <TableRow style={{ height: paddingBottom }}>
                                       <TableCell colSpan={categoryVariationIds.length + 6} style={{ padding: 0, border: "none" }} />
                                    </TableRow>
                                 ) : null;
                              })()}
                           </TableBody>
                        </Table>
                     </div>
                  ) : (
                     <div className="text-sm text-muted-foreground">Select a category to get variants.</div>
                  )}

               </div>

               <Separator />

               <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                     <Label>Product Attributes</Label>
                     <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={loading || !attributes.length || productAttributes.length >= attributes.length}
                        onClick={addAttributeRow}
                     >
                        <Plus className="h-4 w-4" />
                        Add Attribute
                     </Button>
                  </div>

                  {productAttributes.length > 0 ? (
                     <div className="space-y-3">
                        {/* Column headers */}
                        <div className="flex gap-3 items-center px-0">
                           <Label className="flex-1 text-muted-foreground font-normal text-xs">Attribute</Label>
                           <Label className="flex-1 text-muted-foreground font-normal text-xs">Value</Label>
                           <div className="w-8" />
                        </div>

                        {productAttributes.map((attr, index) => {
                           const usedIds = new Set(
                              productAttributes.map((a) => a.attributeId).filter((id) => id > 0)
                           );
                           const selectedAttribute = attr.attributeId ? indexedAttributes[attr.attributeId] : undefined;

                           return (
                              <div key={index} className="flex gap-3 items-start">
                                 {/* Attribute selector */}
                                 <FormField
                                    disabled={loading}
                                    control={productForm.control}
                                    name={`attributes.${index}.attributeId`}
                                    render={({ field }) => (
                                       <FormItem className="flex-1">
                                          <FormControl>
                                             <Select
                                                disabled={field.disabled}
                                                value={field.value ? String(field.value) : ""}
                                                onValueChange={(value) => {
                                                   field.onChange(parseInt(value));
                                                   productForm.setValue(`attributes.${index}.value`, "", { shouldDirty: true });
                                                }}
                                             >
                                                <SelectTrigger>
                                                   <SelectValue placeholder="Select attribute" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                   {attributes
                                                      .filter((a) => a.attributeId === attr.attributeId || !usedIds.has(a.attributeId))
                                                      .map((a) => (
                                                         <SelectItem key={a.attributeId} value={String(a.attributeId)}>
                                                            {a.name}
                                                         </SelectItem>
                                                      ))}
                                                </SelectContent>
                                             </Select>
                                          </FormControl>
                                          <FormMessage />
                                       </FormItem>
                                    )}
                                 />

                                 {/* Value input / select */}
                                 <FormField
                                    disabled={loading || !attr.attributeId}
                                    control={productForm.control}
                                    name={`attributes.${index}.value`}
                                    render={({ field }) => (
                                       <FormItem className="flex-1">
                                          <FormControl>
                                             {!selectedAttribute ? (
                                                <Input {...field} placeholder="Select attribute first" disabled />
                                             ) : selectedAttribute.type === AttributeType.CUSTOM ? (
                                                <Input {...field} placeholder="Enter value" />
                                             ) : (
                                                <Select
                                                   disabled={field.disabled}
                                                   value={field.value}
                                                   onValueChange={field.onChange}
                                                >
                                                   <SelectTrigger>
                                                      <SelectValue placeholder="Select value" />
                                                   </SelectTrigger>
                                                   <SelectContent>
                                                      {selectedAttribute.allowedValues.map((option) => (
                                                         <SelectItem key={option} value={option}>
                                                            {option}
                                                         </SelectItem>
                                                      ))}
                                                   </SelectContent>
                                                </Select>
                                             )}
                                          </FormControl>
                                          <FormMessage />
                                       </FormItem>
                                    )}
                                 />

                                 {/* Remove button */}
                                 <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-8 shrink-0"
                                    disabled={loading}
                                    onClick={() => removeAttributeRow(index)}
                                 >
                                    <Trash2 className="h-4 w-4" />
                                 </Button>
                              </div>
                           );
                        })}
                     </div>
                  ) : (
                     <div className="text-sm text-muted-foreground">
                        {attributes.length
                           ? `No attributes added. Click "Add Attribute" to add one.`
                           : "No attributes available. Create attributes first."}
                     </div>
                  )}
               </div>
            </div>
            )}

            {productForm.formState.errors.root && (
               <div className="text-sm font-medium text-destructive">{productForm.formState.errors.root.message}</div>
            )}

            <Button type="submit" disabled={!formPopulated || loading || !productForm.formState.isDirty}>
               {loading && <Spinner />}
               {mode === "update" ? "Update Product" : "Create Product"}
            </Button>
         </form>
      </Form>

      <Dialog ref={addCategoryDialogRef}>
         <DialogContent className="gap-6" aria-describedby="">
            <DialogHeader>
               <DialogTitle>
                  {categoryDialogParent ? `Add subcategory under: ${categoryDialogParent.name}` : `Add Category`}
               </DialogTitle>
            </DialogHeader>
            {categoryDialogParent && (
               <div className="text-sm text-muted-foreground">
                  Parent:{" "}
                  {(() => {
                     const parts: string[] = [];
                     let current: CategoryData | undefined = categoryDialogParent;
                     while (current) {
                        parts.unshift(current.name);
                        current = current.parentCategory;
                     }
                     return parts.join(" > ");
                  })()}
               </div>
            )}
            <AddCategoryForm
               parentCategory={categoryDialogParent}
               variations={variations}
               attributes={attributes}
               loading={createCategory.isLoading}
               onAdd={(data) => {
                  const payload: CategoryDTO = {
                     ...data,
                     ...(categoryDialogParent ? { parentCategoryId: categoryDialogParent.categoryId } : {}),
                  };

                  createCategory.request(payload).onSuccess((res) => {
                     dispatch(fetchCategories());
                     addCategoryDialogRef.current?.close();
                     // Select the newly created category if possible
                     if (res?.categoryId) {
                        fetchCategoryDetails(res.categoryId).onSuccess((categoryDetails) => {
                           const details = registerCategoryDetails(categoryDetails);
                           productForm.setValue("categoryId", details.categoryId, { shouldDirty: true });
                           updateVariantsAndAttributes(details);
                        });
                     }
                     toast.success("Category created successfully!");
                  });
               }}
               manageVariations={() => router.push("/admin/variations")}
               manageAttributes={() => router.push("/admin/attributes")}
            />
         </DialogContent>
      </Dialog>
      </>
   );
}

function registerCategoryDetails(categoryDetails: CategoryDetails): CategoryData {
   const { categoryId } = categoryDetails;

   // Always build fresh CategoryData from the backend response — never return a
   // stale cache entry.  The recursive SQL already returns the full parent chain
   // so every call here has the latest variation/attribute assignments.
   const details: CategoryData = {
      categoryId,
      name: categoryDetails.name,
      code: categoryDetails.code,
      parentCategory: categoryDetails.parentCategory
         ? registerCategoryDetails(categoryDetails.parentCategory)
         : undefined,
      variationIds: categoryDetails.variations.map((v) => v.variationId),
      attributeIds: categoryDetails.attributes.map((a) => a.attributeId),
   };
   categoryDetailsMap.set(categoryId, details);
   return details;
}

function getCategoryVariations(categoryDetails: CategoryData): number[] {
   const categoryVariationIdSet: Set<number> = new Set();
   let current: CategoryData | undefined = categoryDetails;
   while (current) {
      current.variationIds.forEach((vId) => {
         if (categoryVariationIdSet.has(vId)) return;
         categoryVariationIdSet.add(vId);
      });
      current = current.parentCategory;
   }
   return Array.from(categoryVariationIdSet).sort();
}

function getCategoryAttributes(categoryDetails: CategoryData): number[] {
   const categoryAttributeIdSet: Set<number> = new Set();
   let current: CategoryData | undefined = categoryDetails;
   while (current) {
      current.attributeIds.forEach((vId) => {
         if (categoryAttributeIdSet.has(vId)) return;
         categoryAttributeIdSet.add(vId);
      });
      current = current.parentCategory;
   }
   return Array.from(categoryAttributeIdSet);
}

function getVariantsFromVariations(variations: Variation[]): ProductFormData["variants"] {
   if (!variations.length) return [];

   const variation = variations[0];
   const options = variation.variationOptions || [];
   let variantProperties = options.map((o) => [o.variationOptionId]);
   for (let i = 1; i < variations.length; i++) {
      const varI = variations[i];
      const varIOptions = varI.variationOptions || [];
      variantProperties = variantProperties.flatMap((variant) => varIOptions.map((o) => [...variant, o.variationOptionId]));
   }

   return variantProperties.map((options) => ({
      sku: "",
      price: 0,
      quantityInStock: 0,
      disabled: false,
      variationOptionIds: options,
   }));
}