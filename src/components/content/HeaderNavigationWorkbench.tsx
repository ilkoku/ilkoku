"use client";

import { useMemo, useState } from "react";
import { saveHeaderNavigationAction } from "@/features/cms/navigation-actions";
import type {
  HeaderNavigationPayload,
  SiteMapPage,
} from "@/lib/cms-header-navigation";
import styles from "./HeaderNavigationWorkbench.module.css";

type Props = {
  initial: HeaderNavigationPayload;
  pages: readonly SiteMapPage[];
};

function clone(value: HeaderNavigationPayload): HeaderNavigationPayload {
  return JSON.parse(JSON.stringify(value)) as HeaderNavigationPayload;
}

function snapshot(value: HeaderNavigationPayload) {
  return JSON.stringify(value);
}

export function HeaderNavigationWorkbench({ initial, pages }: Props) {
  const [value, setValue] = useState<HeaderNavigationPayload>(() => clone(initial));
  const [selectedMenuId, setSelectedMenuId] = useState(initial.menus[0]?.id ?? "");
  const [selectedGroupId, setSelectedGroupId] = useState(initial.menus[0]?.groups[0]?.id ?? "");
  const [selectedArea, setSelectedArea] = useState("Yazar");
  const [query, setQuery] = useState("");
  const [selectedPages, setSelectedPages] = useState<string[]>([]);

  const dirty = useMemo(() => snapshot(value) !== snapshot(initial), [value, initial]);
  const areas = useMemo(() => [...new Set(pages.map((page) => page.area))], [pages]);
  const currentMenu = value.menus.find((menu) => menu.id === selectedMenuId) ?? value.menus[0];
  const currentGroup = currentMenu?.groups.find((group) => group.id === selectedGroupId) ?? currentMenu?.groups[0];

  const visiblePages = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("tr-TR");
    return pages.filter((page) => page.area === selectedArea && (!needle || `${page.label} ${page.group}`.toLocaleLowerCase("tr-TR").includes(needle)));
  }, [pages, query, selectedArea]);

  const groupedPages = useMemo(() => {
    const groups = new Map<string, SiteMapPage[]>();
    for (const page of visiblePages) {
      const list = groups.get(page.group) ?? [];
      list.push(page);
      groups.set(page.group, list);
    }
    return [...groups.entries()];
  }, [visiblePages]);

  const usedPageIds = useMemo(() => new Set(value.menus.flatMap((menu) => menu.groups.flatMap((group) => group.links.map((item) => item.pageId)))), [value]);

  function chooseMenu(menuId: string) {
    setSelectedMenuId(menuId);
    const menu = value.menus.find((item) => item.id === menuId);
    setSelectedGroupId(menu?.groups[0]?.id ?? "");
  }

  function updateMenuLabel(next: string) {
    setValue((current) => ({
      menus: current.menus.map((menu) => menu.id === selectedMenuId ? { ...menu, label: next.slice(0, 60) } : menu),
    }));
  }

  function updateGroupTitle(groupId: string, next: string) {
    setValue((current) => ({
      menus: current.menus.map((menu) => menu.id !== selectedMenuId ? menu : {
        ...menu,
        groups: menu.groups.map((group) => group.id === groupId ? { ...group, title: next.slice(0, 80) } : group),
      }),
    }));
  }

  function togglePage(pageId: string) {
    setSelectedPages((current) => current.includes(pageId) ? current.filter((id) => id !== pageId) : [...current, pageId]);
  }

  function addSelected() {
    if (!currentMenu || !currentGroup || selectedPages.length === 0) return;
    setValue((current) => ({
      menus: current.menus.map((menu) => menu.id !== currentMenu.id ? menu : {
        ...menu,
        groups: menu.groups.map((group) => group.id !== currentGroup.id ? group : {
          ...group,
          links: [
            ...group.links,
            ...selectedPages.filter((pageId) => !group.links.some((item) => item.pageId === pageId)).map((pageId) => ({ pageId })),
          ],
        }),
      }),
    }));
    setSelectedPages([]);
  }

  function updateLinkLabel(groupId: string, pageId: string, next: string) {
    setValue((current) => ({
      menus: current.menus.map((menu) => menu.id !== selectedMenuId ? menu : {
        ...menu,
        groups: menu.groups.map((group) => group.id !== groupId ? group : {
          ...group,
          links: group.links.map((item) => item.pageId === pageId ? { ...item, label: next.slice(0, 80) || undefined } : item),
        }),
      }),
    }));
  }

  function removeLink(groupId: string, pageId: string) {
    setValue((current) => ({
      menus: current.menus.map((menu) => menu.id !== selectedMenuId ? menu : {
        ...menu,
        groups: menu.groups.map((group) => group.id !== groupId ? group : { ...group, links: group.links.filter((item) => item.pageId !== pageId) }),
      }),
    }));
  }

  function moveLink(groupId: string, pageId: string, direction: -1 | 1) {
    setValue((current) => ({
      menus: current.menus.map((menu) => menu.id !== selectedMenuId ? menu : {
        ...menu,
        groups: menu.groups.map((group) => {
          if (group.id !== groupId) return group;
          const index = group.links.findIndex((item) => item.pageId === pageId);
          const target = index + direction;
          if (index < 0 || target < 0 || target >= group.links.length) return group;
          const links = [...group.links];
          [links[index], links[target]] = [links[target], links[index]];
          return { ...group, links };
        }),
      }),
    }));
  }

  function setPrimary(groupId: string, pageId: string, primary: boolean) {
    setValue((current) => ({
      menus: current.menus.map((menu) => menu.id !== selectedMenuId ? menu : {
        ...menu,
        groups: menu.groups.map((group) => group.id !== groupId ? group : {
          ...group,
          links: group.links.map((item) => item.pageId === pageId ? { ...item, primary } : item),
        }),
      }),
    }));
  }

  return (
    <div className={styles.workbench}>
      <div className={styles.topbar}>
        <div>
          <span className={styles.eyebrow}>Site Haritası & Menü Yönetimi</span>
          <h2>Sayfayı seç, menüye yerleştir</h2>
          <p>URL yazmadan gerçek İlkOku sayfalarını seç. Menü adı değişebilir; sayfanın gerçek adresi sistem tarafından korunur.</p>
        </div>
        <div className={styles.targetBox}>
          <label><span>Hedef ana menü</span><select value={currentMenu?.id ?? ""} onChange={(event) => chooseMenu(event.target.value)}>{value.menus.map((menu) => <option value={menu.id} key={menu.id}>{menu.label}</option>)}</select></label>
          <label><span>Hedef sütun</span><select value={currentGroup?.id ?? ""} onChange={(event) => setSelectedGroupId(event.target.value)}>{currentMenu?.groups.map((group) => <option value={group.id} key={group.id}>{group.title}</option>)}</select></label>
          <button type="button" onClick={addSelected} disabled={selectedPages.length === 0}>Seçilileri Menüye Ekle ({selectedPages.length})</button>
        </div>
      </div>

      <div className={styles.layout}>
        <aside className={styles.mapPane}>
          <div className={styles.areaTabs}>{areas.map((area) => <button type="button" key={area} data-active={area === selectedArea} onClick={() => { setSelectedArea(area); setSelectedPages([]); }}>{area}</button>)}</div>
          <input className={styles.search} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Sayfa ara…" />
          <div className={styles.mapTree}>
            {groupedPages.map(([group, groupPages]) => (
              <section className={styles.mapGroup} key={group}>
                <h3>{group}</h3>
                {groupPages.map((page) => {
                  const selected = selectedPages.includes(page.id);
                  const used = usedPageIds.has(page.id);
                  return (
                    <label className={styles.pageRow} key={page.id} data-selected={selected}>
                      <input type="checkbox" checked={selected} onChange={() => togglePage(page.id)} />
                      <span><strong>{page.label}</strong><small>{page.href}</small></span>
                      <em data-used={used}>{used ? "Menüde" : page.kind === "education" ? "Eğitim" : page.kind === "action" ? "Aksiyon" : "Sayfa"}</em>
                    </label>
                  );
                })}
              </section>
            ))}
          </div>
        </aside>

        <form action={saveHeaderNavigationAction} className={styles.menuPane}>
          <input type="hidden" name="headerNavigationJson" value={JSON.stringify(value)} />
          <div className={styles.menuTabs}>{value.menus.map((menu) => <button type="button" key={menu.id} data-active={menu.id === currentMenu?.id} onClick={() => chooseMenu(menu.id)}>{menu.label}</button>)}</div>
          {currentMenu ? <>
            <label className={styles.menuTitle}><span>Üst menü adı</span><input value={currentMenu.label} onChange={(event) => updateMenuLabel(event.target.value)} /></label>
            <div className={styles.columns}>
              {currentMenu.groups.map((group) => (
                <section className={styles.column} key={group.id} data-target={group.id === currentGroup?.id}>
                  <div className={styles.columnHeader}>
                    <input aria-label="Sütun başlığı" value={group.title} onChange={(event) => updateGroupTitle(group.id, event.target.value)} />
                    <button type="button" onClick={() => setSelectedGroupId(group.id)}>{group.id === currentGroup?.id ? "Hedef sütun" : "Buraya ekle"}</button>
                  </div>
                  <div className={styles.linkList}>
                    {group.links.length === 0 ? <div className={styles.empty}>Bu sütunda bağlantı yok.</div> : group.links.map((item, index) => {
                      const page = pages.find((entry) => entry.id === item.pageId);
                      if (!page) return null;
                      return (
                        <div className={styles.linkRow} key={item.pageId}>
                          <div className={styles.linkInfo}><strong>{item.label || page.label}</strong><small>{page.href}</small></div>
                          <input aria-label={`${page.label} menü adı`} placeholder={page.label} value={item.label ?? ""} onChange={(event) => updateLinkLabel(group.id, item.pageId, event.target.value)} />
                          <label className={styles.primaryToggle}><input type="checkbox" checked={Boolean(item.primary)} onChange={(event) => setPrimary(group.id, item.pageId, event.target.checked)} /><span>Büyük göster</span></label>
                          <div className={styles.rowActions}><button type="button" disabled={index === 0} onClick={() => moveLink(group.id, item.pageId, -1)}>↑</button><button type="button" disabled={index === group.links.length - 1} onClick={() => moveLink(group.id, item.pageId, 1)}>↓</button><button type="button" onClick={() => removeLink(group.id, item.pageId)}>Çıkar</button></div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </> : null}

          <div className={styles.saveBar}>
            <div><strong>{dirty ? "Kaydedilmemiş menü değişiklikleri var" : "Menü çalışma kopyası güncel"}</strong><small>Kaydetmek canlı header’ı değiştirmez. Yayınlama ayrı adımdır.</small></div>
            <div className="content-form-actions"><button type="button" disabled={!dirty} onClick={() => setValue(clone(initial))}>Değişiklikleri geri al</button><button type="submit" disabled={!dirty}>Menü Taslağını Kaydet</button></div>
          </div>
        </form>
      </div>
    </div>
  );
}
