import type { NavigationItem as NavigationItemType } from "@/types/navigation";

type NavItemProps = NavigationItemType & {
  active?: boolean;
};

export function NavItem({ active = false, badge, disabled, href, label }: NavItemProps) {
  const content = (
    <>
      <span className="nav-item__indicator" aria-hidden="true" />
      <span>{label}</span>
      {badge && <small>{badge}</small>}
    </>
  );

  if (disabled) {
    return <span className="nav-item nav-item--disabled" aria-disabled="true">{content}</span>;
  }

  return (
    <a className="nav-item" data-active={active || undefined} href={href} aria-current={active ? "page" : undefined}>
      {content}
    </a>
  );
}
