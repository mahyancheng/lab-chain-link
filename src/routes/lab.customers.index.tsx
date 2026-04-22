import { createFileRoute } from "@tanstack/react-router";
import { Route as AdminListRoute } from "./admin.customers.index";

export const Route = createFileRoute("/lab/customers/")({
  component: AdminListRoute.options.component!,
});
