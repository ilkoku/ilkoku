import { Card } from "@/components/ui/Card";
import { dashboardContent } from "@/content";
import type { WorkWithChapterSummary } from "@/features/works/types";
import { BookCard } from "./BookCard";
import { MetricCard } from "./MetricCard";
import { ProgressBar } from "./ProgressBar";
import { NewWorkFlow } from "@/features/writer/components/NewWorkFlow";
import { DashboardFeedback } from "@/features/feedback/components/DashboardFeedback";
import type { FeedbackItem } from "@/features/feedback/types";
import { DashboardPublishers } from "@/features/publishers/components/DashboardPublishers";
import type { PublisherDashboardData } from "@/features/publishers/types";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function WriterDashboard({ feedback, publishers, works }: { feedback: { items: FeedbackItem[]; unreadCount: number }; publishers: PublisherDashboardData; works: WorkWithChapterSummary[] }) {
  const latestWork = works[0] ?? null;
  const totalWords = works.reduce((total, work) => total + work.totalWords, 0);
  const chapterCount = works.reduce((total, work) => total + work.chapterCount, 0);
  const writingGoal = { current: Math.min(totalWords, dashboardContent.dailyGoalTarget), target: dashboardContent.dailyGoalTarget };
  const metrics = [
    { id: "words", label: "Toplam Yazılan Kelime", value: totalWords.toLocaleString("tr-TR"), detail: `${works.length} ${dashboardContent.workSuffix}` },
    { id: "chapters", label: "Toplam Bölüm", value: chapterCount.toLocaleString("tr-TR"), detail: `${works.filter((work) => work.status === "draft" || work.status === "in_progress").length} aktif eser` },
    { id: "published", label: "Yayınlanan Eser", value: works.filter((work) => work.status === "published").length.toLocaleString("tr-TR"), detail: "Herkese açık eserler" },
  ];

  return (
    <div className="dashboard">
      <div className="dashboard__main">
        <header className="dashboard-hero">
          <div className="dashboard-hero__heading">
            <div>
              <p className="dashboard-hero__eyebrow">{dashboardContent.eyebrow}</p>
              <h1>{dashboardContent.greeting} <span aria-hidden="true">👋</span></h1>
            </div>
            <NewWorkFlow />
          </div>
          <div className="daily-goal">
            <div className="daily-goal__header">
              <div>
                <p>{dashboardContent.dailyGoal}</p>
                <strong>{writingGoal.current} / {writingGoal.target} {dashboardContent.wordUnit}</strong>
              </div>
              <span>%{Math.round((writingGoal.current / writingGoal.target) * 100)}</span>
            </div>
            <ProgressBar value={writingGoal.current} max={writingGoal.target} label={dashboardContent.dailyGoalLabel} />
          </div>
        </header>

        {latestWork ? (
          <section aria-labelledby="latest-work-title">
            <h2 className="section-title" id="latest-work-title">{dashboardContent.latestWorkTitle}</h2>
            <Card className="latest-work" variant="hover">
              <div className="latest-work__cover" aria-hidden="true">
                <span>✦</span>
                <strong>{latestWork.title}</strong>
                <small>{dashboardContent.originalNovel}</small>
              </div>
              <div className="latest-work__content">
                <p>{latestWork.genre}</p>
                <h3>{latestWork.title}</h3>
                <span>{latestWork.latestChapter?.title ?? "İlk bölüm bekleniyor"}</span>
                <dl>
                  <div><dt>{dashboardContent.lastEdited}</dt><dd>{formatDate(latestWork.updated_at)}</dd></div>
                  <div><dt>{dashboardContent.progress}</dt><dd>{latestWork.totalWords.toLocaleString("tr-TR")} {dashboardContent.wordSuffix}</dd></div>
                </dl>
                <NewWorkFlow initialWork={latestWork} triggerLabel={dashboardContent.continue} />
              </div>
            </Card>
          </section>
        ) : (
          <Card className="dashboard-empty">
            <h2>{dashboardContent.emptyWorksTitle}</h2>
            <p>{dashboardContent.emptyWorksDescription}</p>
          </Card>
        )}

        <section className="metrics" aria-label={dashboardContent.writingSummary}>
          {metrics.map((metric) => <MetricCard key={metric.id} {...metric} />)}
        </section>

        <DashboardFeedback items={feedback.items} unreadCount={feedback.unreadCount} />

        <DashboardPublishers data={publishers} />

        <section className="dashboard-section" aria-labelledby="books-title">
          <div className="section-heading">
            <div><p>{dashboardContent.library}</p><h2 id="books-title">{dashboardContent.myWorks}</h2></div>
            <span>{works.length} {dashboardContent.workSuffix}</span>
          </div>
          {works.length > 0 ? (
            <div className="books-grid">
              {works.map((work, index) => <BookCard coverVariant={(["one", "two", "three"] as const)[index % 3]} key={work.id} work={work} />)}
            </div>
          ) : <p className="dashboard-empty-copy">{dashboardContent.emptyWorksDescription}</p>}
        </section>
      </div>

      <aside className="dashboard__aside" aria-label={dashboardContent.dailySummary}>
        <Card className="motivation-card">
          <p>{dashboardContent.motivationTitle}</p>
          <blockquote>“{dashboardContent.motivation}”</blockquote>
          <span aria-hidden="true">✦</span>
        </Card>
        <Card className="streak-card">
          <p>{dashboardContent.streakTitle}</p>
          <strong><span aria-hidden="true">🔥</span> {dashboardContent.streak}</strong>
          <span>{dashboardContent.streakMessage}</span>
        </Card>
      </aside>
    </div>
  );
}
