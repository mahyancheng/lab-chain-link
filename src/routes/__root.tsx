import { Outlet, Link, createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "CD Agrovet — Lab Testing Platform" },
      {
        name: "description",
        content:
          "Order, track and release fertilizer & raw material lab tests with full QR-tagged chain of custody.",
      },
      { property: "og:title", content: "CD Agrovet — Lab Testing Platform" },
      { property: "og:description", content: "Agro Trace provides a digital platform for lab testing of fertilizers and raw materials." },
      { name: "twitter:title", content: "CD Agrovet — Lab Testing Platform" },
      { name: "description", content: "Agro Trace provides a digital platform for lab testing of fertilizers and raw materials." },
      { name: "twitter:description", content: "Agro Trace provides a digital platform for lab testing of fertilizers and raw materials." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/24673357-cc69-4c90-831c-857ec5c9c8cc/id-preview-62a0d7a2--9cddb68c-e2a9-43d8-9f05-12a692a4babc.lovable.app-1776847843237.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/24673357-cc69-4c90-831c-857ec5c9c8cc/id-preview-62a0d7a2--9cddb68c-e2a9-43d8-9f05-12a692a4babc.lovable.app-1776847843237.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
