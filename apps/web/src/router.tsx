import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Login } from "@/features/auth/Login";
import { Dashboard } from "@/features/dashboard/Dashboard";
import { ContactsList } from "@/features/contacts/ContactsList";
import { ContactDetail } from "@/features/contacts/ContactDetail";
import { ProspectingList } from "@/features/prospecting/ProspectingList";
import { ProspectDetail } from "@/features/prospecting/ProspectDetail";
import { Pipeline } from "@/features/pipeline/Pipeline";
import { Campaigns } from "@/features/campaigns/Campaigns";
import { Templates } from "@/features/templates/Templates";
import { Outreach } from "@/features/outreach/Outreach";
import { Followups } from "@/features/followups/Followups";
import { Products } from "@/features/products/Products";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: Login,
});

const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "_protected",
  component: AppLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});

const dashboardRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/dashboard",
  component: Dashboard,
});

const contactsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/contacts",
  component: ContactsList,
});

const contactDetailRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/contacts/$id",
  component: ContactDetail,
});

const prospectingRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/prospecting",
  component: ProspectingList,
});

const prospectDetailRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/prospecting/$id",
  component: ProspectDetail,
});

const pipelineRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/pipeline",
  component: Pipeline,
});

const campaignsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/campaigns",
  component: Campaigns,
});

const templatesRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/templates",
  component: Templates,
});

const outreachRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/outreach",
  component: Outreach,
});

const followupsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/followups",
  component: Followups,
});

const productsRoute = createRoute({
  getParentRoute: () => protectedRoute,
  path: "/products",
  component: Products,
});

const routeTree = rootRoute.addChildren([
  loginRoute,
  protectedRoute.addChildren([
    indexRoute,
    dashboardRoute,
    contactsRoute,
    contactDetailRoute,
    prospectingRoute,
    prospectDetailRoute,
    pipelineRoute,
    campaignsRoute,
    templatesRoute,
    outreachRoute,
    followupsRoute,
    productsRoute,
  ]),
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
