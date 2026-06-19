import { Link } from "@tanstack/react-router";
import { Users, Send, MessageSquare, CalendarCheck, Trophy, Percent, CalendarClock, Megaphone } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ContactStatusBadge } from "@/components/StatusBadge";
import { useDashboard } from "@/lib/hooks";
import { formatDate } from "@/lib/utils";

function StatCard({ icon: Icon, label, value, hint }: { icon: React.ElementType; label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
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
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
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
        <StatCard icon={Percent} label="Conversion Rate" value={`${data.conversionRate}%`} hint="contacted → customer" />
        <StatCard icon={Megaphone} label="Active Campaigns" value={data.activeCampaigns} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4" /> Follow-ups Due Today
            </CardTitle>
            <CardDescription>Contacts requiring follow-up</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{data.followupsDueToday}</p>
            <Link to="/followups" className="mt-2 inline-block text-sm text-primary hover:underline">
              View follow-ups →
            </Link>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" /> Recent Replies
            </CardTitle>
            <CardDescription>Contacts who replied most recently</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentReplies.length === 0 ? (
              <p className="text-sm text-muted-foreground">No replies yet.</p>
            ) : (
              <ul className="divide-y">
                {data.recentReplies.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-2">
                    <Link to="/contacts/$id" params={{ id: c.id }} className="hover:underline">
                      <span className="font-medium">{c.firstName} {c.lastName}</span>
                      <span className="text-muted-foreground"> · {c.company ?? c.email}</span>
                    </Link>
                    <div className="flex items-center gap-2">
                      {c.product && <span className="text-xs text-muted-foreground">{c.product.name}</span>}
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
        <CardHeader>
          <CardTitle className="text-base">Pipeline Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {data.pipeline.map((p) => (
              <div key={p.status} className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-semibold">{p.count}</p>
                <p className="text-xs capitalize text-muted-foreground">{p.status.replace(/_/g, " ").toLowerCase()}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground">Last updated {formatDate(new Date())}</p>
    </div>
  );
}
