import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Order = Tables<"orders">;
export type OrderSample = Tables<"order_samples">;
export type Product = Tables<"products">;
export type TestTemplate = Tables<"test_templates">;
export type TestParameter = Tables<"test_parameters">;
export type TestResult = Tables<"test_results">;
export type Profile = Tables<"profiles">;
export type Exception = Tables<"exceptions">;
export type Payment = Tables<"payments">;
export type Shipment = Tables<"shipments">;
export type ChainEvent = Tables<"chain_of_custody_events">;
export type SavedPanel = Tables<"saved_test_panels">;

const SELECT_ORDER_LIST =
  "id, order_number, stage, total, delivery_type, created_at" as const;

type OrderListRow = Pick<
  Order,
  "id" | "order_number" | "stage" | "total" | "delivery_type" | "created_at"
>;

export const customerOrdersQuery = () =>
  queryOptions<OrderListRow[]>({
    queryKey: ["orders", "customer"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(SELECT_ORDER_LIST)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

export const adminOrdersQuery = () =>
  queryOptions<OrderListRow[]>({
    queryKey: ["orders", "admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(SELECT_ORDER_LIST)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

export const releaseQueueQuery = () =>
  queryOptions({
    queryKey: ["release-queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_samples")
        .select("id, sample_label, order_id, qa_verified_at")
        .eq("stage", "ready_for_release");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

export const openExceptionsQuery = () =>
  queryOptions<Exception[]>({
    queryKey: ["exceptions", "open"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exceptions")
        .select("*")
        .eq("status", "open")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

export const labQueueQuery = () =>
  queryOptions({
    queryKey: ["lab-queue"],
    queryFn: async () => {
      const { data: samples, error } = await supabase
        .from("order_samples")
        .select("*")
        .not("stage", "in", "(released,rejected)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list = samples ?? [];
      const orderIds = Array.from(new Set(list.map((s) => s.order_id)));
      const productIds = Array.from(
        new Set(list.map((s) => s.product_id).filter(Boolean)),
      );

      const [ordersRes, productsRes] = await Promise.all([
        orderIds.length
          ? supabase.from("orders").select("id, order_number").in("id", orderIds)
          : Promise.resolve({ data: [] as { id: string; order_number: string }[] }),
        productIds.length
          ? supabase.from("products").select("id, name").in("id", productIds)
          : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      ]);

      const orders = Object.fromEntries(
        (ordersRes.data ?? []).map((o) => [o.id, o]),
      );
      const products = Object.fromEntries(
        (productsRes.data ?? []).map((p) => [p.id, p]),
      );
      return { samples: list, orders, products };
    },
    staleTime: 15_000,
  });

export const productCatalogQuery = () =>
  queryOptions<Product[]>({
    queryKey: ["products", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("active", true);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

export const testTemplatesQuery = () =>
  queryOptions<TestTemplate[]>({
    queryKey: ["test-templates", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_templates")
        .select("*")
        .eq("active", true);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });

export const savedPanelsQuery = (userId: string) =>
  queryOptions<SavedPanel[]>({
    queryKey: ["saved-panels", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("saved_test_panels")
        .select("*")
        .eq("customer_id", userId);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

export const adminUsersQuery = () =>
  queryOptions({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, company, phone, created_at")
          .order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      return {
        profiles: profilesRes.data ?? [],
        roles: rolesRes.data ?? [],
      };
    },
    staleTime: 30_000,
  });
