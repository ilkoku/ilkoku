import { PublicSiteFooter, type HomepageFooterProps } from "@/components/content/PublicSiteFooter";

// Preserve the existing CSS loading boundary for landing, guides and lessons.
import "@/app/landing-footer-pro.css";
import "@/app/landing-footer-tight.css";
import "./live-footer.css";

// Compatibility entry-point: all markup and navigation live in PublicSiteFooter.
export default function LiveHomepageFooter(props: HomepageFooterProps) {
  return <PublicSiteFooter variant="landing" {...props} />;
}
