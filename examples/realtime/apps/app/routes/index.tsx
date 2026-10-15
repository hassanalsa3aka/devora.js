import { Island, PageShell, island, redirect, type RequestContext, type RouteComponentProps } from "@devorajs/core";

export const renderMode = "ssr";

export function meta() {
  return { title: "Live orders", description: "A dashboard that updates without reloading" };
}

export async function loader(ctx: RequestContext) {
  if (!ctx.session) throw redirect("/login");
  return { user: (ctx.session as { username: string }).username };
}

const LiveOrders = island(() => import("../components/LiveOrders"));

export default function Dashboard({ data, csrfToken }: RouteComponentProps<{ user: string }>) {
  return (
    <PageShell appName="app" nav={[{ label: "Log out", href: "/logout" }]}>
      <h1>Live orders</h1>
      <p className="devora-lead">
        Signed in as <strong>{data?.user}</strong>. Place an order, or open this page in a second tab, and the list
        updates without a reload.
      </p>
      <Island component={LiveOrders} props={{ csrfToken: csrfToken ?? "" }} />
    </PageShell>
  );
}
