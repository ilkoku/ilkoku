import "../publishers.css";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { publishersContent } from "@/content";
import type { PublisherDashboardData } from "../types";

export function DashboardPublishers({ data }: { data: PublisherDashboardData }) {
  return <section aria-labelledby="dashboard-publishers-title"><div className="section-heading"><div><p>{publishersContent.eyebrow}</p><h2 id="dashboard-publishers-title">{publishersContent.dashboard.title}</h2></div></div><Card className="dashboard-publishers"><div className="dashboard-publishers__stats"><span><strong>{data.pending}</strong>{publishersContent.dashboard.pending}</span><span><strong>{data.reviewing}</strong>{publishersContent.dashboard.reviewing}</span><span><strong>{data.accepted}</strong>{publishersContent.dashboard.accepted}</span></div>{data.items.length ? <div className="dashboard-publishers__list">{data.items.map((item) => <div key={item.id}><span>{item.publisher.companyName}</span><strong>{item.work.title}</strong><small>{publishersContent.statuses[item.status]}</small></div>)}</div> : <p>{publishersContent.dashboard.empty}</p>}<Link className="dashboard-publishers__link" href="/yayinevleri">{publishersContent.dashboard.all}</Link></Card></section>;
}
