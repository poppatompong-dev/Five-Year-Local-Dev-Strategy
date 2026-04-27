import { Outlet, Link, createRootRoute, HeadContent, Scripts, useNavigate } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NeonAuthUIProvider } from "@neondatabase/neon-js/auth/react";
import { authClient } from "../auth";

import appCss from "../styles.css?url";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5 } },
});

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ระบบบริหารแผนพัฒนาท้องถิ่น · เทศบาลนครนครสวรรค์" },
      { name: "description", content: "ระบบบริหารจัดการแผนพัฒนาท้องถิ่นเทศบาลนครนครสวรรค์ ปี พ.ศ. 2566–2570" },
      { name: "author", content: "เทศบาลนครนครสวรรค์" },
      { property: "og:title", content: "ระบบบริหารแผนพัฒนาท้องถิ่น · เทศบาลนครนครสวรรค์" },
      { property: "og:description", content: "ระบบบริหารจัดการแผนพัฒนาท้องถิ่นเทศบาลนครนครสวรรค์ ปี พ.ศ. 2566–2570" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
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
  const navigate = useNavigate();
  return (
    <QueryClientProvider client={queryClient}>
      <NeonAuthUIProvider
        authClient={authClient}
        navigate={(path) => navigate({ to: path })}
        social={{ providers: [] }}
        credentials={{ forgotPassword: false }}
      >
        <Outlet />
      </NeonAuthUIProvider>
    </QueryClientProvider>
  );
}
