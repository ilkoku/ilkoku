"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
} from "react";

type PublicHeaderMenu = {
  id: string;
  label: string;
  groups: Array<{
    id: string;
    title: string;
    links: Array<{
      href: string;
      label: string;
      primary: boolean;
      pageId: string;
    }>;
  }>;
};

const CLOSE_DELAY_MS = 140;

function MenuGroups({
  menu,
  onNavigate,
}: {
  menu: PublicHeaderMenu;
  onNavigate?: () => void;
}) {
  const columns = Math.min(menu.groups.length, 3);

  return (
    <div
      className="public-site-header__mega-grid"
      style={{ "--mega-columns": columns } as CSSProperties}
    >
      {menu.groups.map((group) => (
        <section className="public-site-header__mega-group" key={`${menu.id}-${group.id}`}>
          <h2>{group.title}</h2>
          <div className="public-site-header__mega-links">
            {group.links.map((link) => (
              <Link
                href={link.href}
                data-primary={link.primary ? "true" : undefined}
                key={`${menu.id}-${group.id}-${link.pageId}`}
                onClick={onNavigate}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function PublicHeaderNavigation({ menus }: { menus: PublicHeaderMenu[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileMenuId, setMobileMenuId] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeMenu = menus.find((menu) => menu.id === activeId) ?? null;
  const mobileMenu = menus.find((menu) => menu.id === mobileMenuId) ?? null;

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);

  const closeDesktop = useCallback(() => {
    cancelClose();
    setActiveId(null);
  }, [cancelClose]);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      setActiveId(null);
      closeTimer.current = null;
    }, CLOSE_DELAY_MS);
  }, [cancelClose]);

  const activate = useCallback((menuId: string) => {
    cancelClose();
    setMobileOpen(false);
    setMobileMenuId(null);
    setActiveId(menuId);
  }, [cancelClose]);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
    setMobileMenuId(null);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      closeDesktop();
      closeMobile();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      cancelClose();
    };
  }, [cancelClose, closeDesktop, closeMobile]);

  const handleDesktopBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    scheduleClose();
  };

  return (
    <>
      {activeMenu ? (
        <button
          className="public-site-header__scrim public-site-header__scrim--desktop"
          type="button"
          aria-label="Menüyü kapat"
          onClick={closeDesktop}
          tabIndex={-1}
        />
      ) : null}

      <div
        className="public-site-header__desktop-nav"
        onMouseEnter={cancelClose}
        onMouseLeave={scheduleClose}
        onBlur={handleDesktopBlur}
      >
        <nav className="public-site-header__navigation" aria-label="Ana menü">
          {menus.map((menu) => {
            const isActive = menu.id === activeId;
            return (
              <button
                className="public-site-header__menu-trigger"
                type="button"
                key={menu.id}
                data-active={isActive ? "true" : undefined}
                aria-expanded={isActive}
                aria-controls="public-site-header-mega-panel"
                onMouseEnter={() => activate(menu.id)}
                onFocus={() => activate(menu.id)}
                onClick={() => setActiveId(isActive ? null : menu.id)}
              >
                {menu.label}
              </button>
            );
          })}
        </nav>

        {activeMenu ? (
          <div
            className="public-site-header__mega"
            id="public-site-header-mega-panel"
            role="region"
            aria-label={`${activeMenu.label} menüsü`}
          >
            <MenuGroups menu={activeMenu} onNavigate={closeDesktop} />
          </div>
        ) : null}
      </div>

      <div className="public-site-header__mobile-menu" data-open={mobileOpen ? "true" : undefined}>
        <button
          className="public-site-header__mobile-toggle"
          type="button"
          aria-expanded={mobileOpen}
          aria-controls="public-site-header-mobile-panel"
          onClick={() => {
            closeDesktop();
            setMobileOpen((open) => !open);
            if (mobileOpen) setMobileMenuId(null);
          }}
        >
          <span className="public-site-header__mobile-toggle-icon" aria-hidden="true">
            {mobileOpen ? "×" : "☰"}
          </span>
          <span>Menü</span>
        </button>

        {mobileOpen ? (
          <>
            <button
              className="public-site-header__scrim public-site-header__scrim--mobile"
              type="button"
              aria-label="Mobil menüyü kapat"
              onClick={closeMobile}
              tabIndex={-1}
            />
            <div className="public-site-header__mobile-panel" id="public-site-header-mobile-panel">
              <div
                className="public-site-header__mobile-track"
                data-detail={mobileMenu ? "true" : undefined}
              >
                <section className="public-site-header__mobile-root" aria-label="Mobil ana menü">
                  <nav>
                    {menus.map((menu) => (
                      <button
                        className="public-site-header__mobile-category"
                        type="button"
                        key={`mobile-root-${menu.id}`}
                        onClick={() => setMobileMenuId(menu.id)}
                      >
                        <span>{menu.label}</span>
                        <span aria-hidden="true">›</span>
                      </button>
                    ))}
                  </nav>
                </section>

                <section className="public-site-header__mobile-detail" aria-live="polite">
                  {mobileMenu ? (
                    <>
                      <button
                        className="public-site-header__mobile-back"
                        type="button"
                        onClick={() => setMobileMenuId(null)}
                      >
                        <span aria-hidden="true">‹</span>
                        <span>Geri</span>
                      </button>
                      <div className="public-site-header__mobile-detail-heading">{mobileMenu.label}</div>
                      <MenuGroups menu={mobileMenu} onNavigate={closeMobile} />
                    </>
                  ) : null}
                </section>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
