import { Link } from "@tanstack/react-router";
import {
  Users,
  Send,
  MessageSquare,
  CalendarCheck,
  Trophy,
  Percent,
  TrendingUp,
  CalendarClock,
  Megaphone,
  ArrowRight,
  GitBranch,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ContactStatusBadge } from "@/components/StatusBadge";
import { useDashboard } from "@/lib/hooks";
import { formatDate, cn, getInitials } from "@/lib/utils";

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card className="transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-5">
        <div className="mb-3 flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
        </div>
        <div className="flex items-end justify-between">
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
          {hint && <span className="mb-1 text-xs text-muted-foreground">{hint}</span>}
        </div>
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const { data, isLoading } = useDashboard();

  if (isLoading || !data) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Your sales pipeline at a glance" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Dashboard" description="Your sales pipeline at a glance" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Contacts" value={data.totalContacts} />
        <StatCard icon={Send} label="Emails Sent" value={data.emailsSent} />
        <StatCard icon={MessageSquare} label="Replies" value={data.replies} />
        <StatCard icon={CalendarCheck} label="Meetings Booked" value={data.meetingsBooked} />
        <StatCard icon={Trophy} label="Customers" value={data.customers} />
        <StatCard icon={Percent} label="Reply Rate" value={`${data.replyRate}%`} hint={`${data.emailsSent} sent`} />
        <StatCard icon={TrendingUp} label="Conversion Rate" value={`${data.conversionRate}%`} hint="contacted → customer" />
        <StatCard icon={Megaphone} label="Active Campaigns" value={data.activeCampaigns} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4 text-primary" /> Follow-ups Due Today
            </CardTitle>
            <CardDescription>Contacts requiring follow-up</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col justify-between">
            <div>
              <p className="text-5xl font-bold tracking-tight">{data.followupsDueToday}</p>
              <p className="mt-1 text-sm text-muted-foreground">Tasks remaining in your queue</p>
            </div>
            <Link
              to="/followups"
              className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              View follow-ups <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-primary" /> Recent Replies
            </CardTitle>
            <CardDescription>Contacts who replied most recently</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentReplies.length === 0 ? (
              <p className="text-sm text-muted-foreground">No replies yet.</p>
            ) : (
              <ul className="space-y-1">
                {data.recentReplies.map((c) => (
                  <li
                    key={c.id}
                    className="-mx-2 flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-muted/50"
                  >
                    <Link to="/contacts/$id" params={{ id: c.id }} className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {getInitials(c.firstName, c.lastName)}
                      </span>
                      <span>
                        <span className="block font-medium">{c.firstName} {c.lastName}</span>
                        <span className="block text-xs text-muted-foreground">{c.company ?? c.email}</span>
                      </span>
                    </Link>
                    <div className="flex items-center gap-3">
                      {c.product && (
                        <span className="hidden rounded bg-muted px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground sm:inline">
                          {c.product.name}
                        </span>
                      )}
                      <ContactStatusBadge status={c.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="h-4 w-4 text-primary" /> Pipeline Overview
          </CardTitle>
          <Link
            to="/pipeline"
            className="text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
          >
            View full pipeline
          </Link>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {data.pipeline.map((p) => {
              const won = p.status === "CUSTOMER";
              return (
                <div
                  key={p.status}
                  className={cn(
                    "rounded-lg border p-3 text-center transition-colors hover:border-primary/30",
                    won && "border-emerald-200 bg-emerald-50/50 hover:border-emerald-300",
                  )}
                >
                  <p className={cn("text-2xl font-semibold", won && "text-emerald-600")}>{p.count}</p>
                  <p className={cn("text-xs capitalize", won ? "text-emerald-600" : "text-muted-foreground")}>
                    {p.status.replace(/_/g, " ").toLowerCase()}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground">Last updated {formatDate(new Date())}</p>
    </div>
  );
}
