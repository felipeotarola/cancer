import { Button } from "./components/ui/Button";
import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import {
  PanelLeftOpen,
  PanelLeftClose,
  PanelRight,
  Share2,
  Menu,
  Moon,
  Sun,
  PanelsTopLeft,
  LayoutGrid,
  Bot,
  Plug,
  House,
  CirclePlus,
  SwatchBook,
} from "lucide-react";
import { ProfileMenu } from "./components/ProfileMenu";
import { Sidebar } from "./components/Sidebar";
import { Chat } from "./components/Chat";
import { LiveChat } from './components/LiveChat';
import { Workspace } from "./components/Workspace";
import { PanelRail } from "./components/PanelRail";
import { FeaturePage } from "./components/FeaturePage";
import { loadThreads, saveThreads, newThread, type Thread } from "./lib/chat";
import "./App.css";
const DesignSystem = lazy(() => import("./components/DesignSystem"));

export default function App({ initialThreads, createRemoteChat, onCreateWorkspace, onShareWorkspace, onAccount, workspaces, workspaceId, onWorkspaceChange, accountEmail, onLogout, workspaceName = 'OpenCancer' }: {
  onAccount?: () => void;
  onShareWorkspace?: () => void;
  workspaces?: { id: string; name: string }[];
  workspaceId?: string;
  onWorkspaceChange?: (id: string) => void;
  accountEmail?: string;
  onLogout?: () => void;
  initialThreads?: Thread[];
  createRemoteChat?: () => Promise<Thread>;
  workspaceName?: string;
  onCreateWorkspace?: () => void;
} = {}) {
  const [threads, setThreads] = useState<Thread[]>(() => initialThreads?.length ? initialThreads : initialThreads ? [{ id: 'empty', title: 'Ny chatt', messages: [] }] : loadThreads());
  const [chatError, setChatError] = useState('');
  const [creatingChat, setCreatingChat] = useState(false);
  const [activeId, setActiveId] = useState(() => threads[0].id);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [pane, setPane] = useState("chat");
  const [workspaceOpen, setWorkspaceOpen] = useState(true);
  const [view, setView] = useState(() =>
    new URLSearchParams(window.location.search).get("view") === "design-system"
      ? "Designsystem"
      : "Översikt",
  );
  const [dark, setDark] = useState(() => {
    try {
      return (
        (localStorage.getItem("agent-workspace-theme") ??
          localStorage.getItem("syna-theme")) === "dark"
      );
    } catch {
      return false;
    }
  });
  const [chatWidth, setChatWidth] = useState(48);
  const split = useRef<HTMLDivElement>(null);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const latestDragWidth = useRef<number | null>(null);
  const drawer = useRef<HTMLDialogElement>(null);
  const navigation = useRef<HTMLElement>(null);
  const previousCollapsed = useRef(collapsed);
  const active = threads.find((t) => t.id === activeId) ?? threads[0];
  const standalone =
    view === "Agenten" || view === "Integrationer" || view === "Designsystem";

  useEffect(() => {
    if (!createRemoteChat) saveThreads(threads);
  }, [threads, createRemoteChat]);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("agent-workspace-theme", dark ? "dark" : "light");
    } catch {
      /* Theme still works without storage. */
    }
  }, [dark]);
  useEffect(() => {
    if (mobileNav) drawer.current?.showModal();
    else drawer.current?.close();
  }, [mobileNav]);
  useEffect(() => {
    if (
      previousCollapsed.current !== collapsed &&
      navigation.current?.contains(document.activeElement)
    ) {
      navigation.current
        .querySelector<HTMLButtonElement>(
          collapsed
            ? ".sidebar-rail .rail-toggle"
            : ".sidebar-expanded .brand-row button",
        )
        ?.focus();
    }
    previousCollapsed.current = collapsed;
  }, [collapsed]);

  function selectChat(id: string) {
    window.history.replaceState(null, "", window.location.pathname);
    setActiveId(id);
    setView("Översikt");
    setPane("chat");
    setMobileNav(false);
  }
  async function createChat() {
    if (creatingChat) return;
    setCreatingChat(true); setChatError('');
    try {
      const thread = createRemoteChat ? await createRemoteChat() : newThread();
      setThreads((prev) => [thread, ...prev.filter(t => t.id !== 'empty')]);
      selectChat(thread.id);
    } catch (e) { setChatError((e as Error).message); }
    finally { setCreatingChat(false); }
  }
  function openView(next: string) {
    window.history.replaceState(
      null,
      "",
      next === "Designsystem"
        ? `${window.location.pathname}?view=design-system`
        : window.location.pathname,
    );
    setView(next);
    setPane("workspace");
    setWorkspaceOpen(true);
    setMobileNav(false);
  }
  function toggleWorkspace() {
    setWorkspaceOpen(!workspaceOpen);
    setPane(workspaceOpen ? "chat" : "workspace");
  }
  const sidebar = (
    <Sidebar
      threads={threads.filter(t => t.id !== 'empty')}
      workspaceName={workspaceName}
      workspaces={workspaces}
      workspaceId={workspaceId}
      onWorkspaceChange={onWorkspaceChange}
      onCreateWorkspace={() => { setMobileNav(false); onCreateWorkspace?.(); }}
      canCreateWorkspace={!!onCreateWorkspace}
      creatingChat={creatingChat}
      activeId={active.id}
      view={view}
      onSelect={selectChat}
      onNew={createChat}
      onView={openView}
    />
  );
  const header = (
    <header className="topbar">
      <div className="topbar-title">
        <Button
          shape="icon"
          className="icon-button mobile-only"
          aria-label="Öppna navigation"
          onClick={() => setMobileNav(true)}
        >
          <Menu />
        </Button>
        <PanelsTopLeft size={18} />
        <span>{standalone ? view : active.title}</span>
      </div>
      <div className="topbar-actions">
        {onShareWorkspace && <Button shape="icon" className="icon-button" aria-label="Dela workspace" title="Dela workspace" onClick={onShareWorkspace}><Share2 size={18} /></Button>}
        {!standalone && (
          <Button
            shape="icon"
            className="icon-button"
            aria-label={workspaceOpen ? "Dölj workspace" : "Visa workspace"}
            aria-expanded={workspaceOpen}
            onClick={toggleWorkspace}
          >
            <PanelRight />
          </Button>
        )}
      </div>
    </header>
  );

  const account = <ProfileMenu email={accountEmail} dark={dark} onTheme={() => setDark(!dark)} onLogout={onLogout} onAccount={onAccount ? () => { setMobileNav(false); onAccount(); } : undefined} />;
  return (
    <div className={`app-shell ${collapsed ? "nav-collapsed" : ""}`}>
      <aside
        ref={navigation}
        className="desktop-sidebar"
        aria-label="Huvudnavigation"
      >
        <div
          className="sidebar-expanded"
          inert={collapsed}
          aria-hidden={collapsed}
        >
          <div className="brand-row">
            <Brand />
            <Button
              shape="icon"
              className="icon-button"
              aria-label="Dölj navigation"
              title="Fäll ihop sidmenyn"
              aria-expanded={!collapsed}
              onClick={() => setCollapsed(true)}
            >
              <PanelLeftClose />
            </Button>
          </div>
          {sidebar}
          {account}
        </div>
        <div
          className="sidebar-rail"
          inert={!collapsed}
          aria-hidden={!collapsed}
        >
          <PanelRail
            label="Kompakt navigation"
            toggleLabel="Visa navigation"
            icon={PanelLeftOpen}
            onToggle={() => setCollapsed(false)}
            items={[
              { label: "Ny chatt", icon: CirclePlus, onClick: createChat },
              {
                label: "Alla workspaces",
                icon: LayoutGrid,
                onClick: () => openView("Alla workspaces"),
                active: view === "Alla workspaces",
              },
              {
                label: "Agenten",
                icon: Bot,
                onClick: () => openView("Agenten"),
                active: view === "Agenten",
              },
              {
                label: "Integrationer",
                icon: Plug,
                onClick: () => openView("Integrationer"),
                active: view === "Integrationer",
              },
              {
                label: "Översikt",
                icon: House,
                onClick: () => openView("Översikt"),
                active: view === "Översikt",
              },
              {
                label: "Designsystem",
                icon: SwatchBook,
                onClick: () => openView("Designsystem"),
                active: view === "Designsystem",
              },
            ]}
            footer={
              <Button
                className="rail-button"
                aria-label="Byt färgtema"
                title="Byt färgtema"
                onClick={() => setDark(!dark)}
              >
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </Button>
            }
          />
        </div>
        <button
          className="sidebar-edge"
          aria-label="Växla sidmeny via kanten"
          aria-expanded={!collapsed}
          title="Dubbelklicka för att öppna eller stänga sidmenyn"
          onDoubleClick={() => setCollapsed((value) => !value)}
          onClick={(event) => {
            if (event.detail === 0) setCollapsed((value) => !value);
          }}
        />
      </aside>
      <dialog
        ref={drawer}
        className="mobile-drawer"
        onCancel={() => setMobileNav(false)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setMobileNav(false);
        }}
      >
        <div className="drawer-content">
          <div className="brand-row">
            <Brand />
            <Button
              shape="icon"
              className="icon-button"
              aria-label="Stäng navigation"
              onClick={() => setMobileNav(false)}
            >
              <PanelLeftClose />
            </Button>
          </div>
          {sidebar}
          {account}
        </div>
      </dialog>
      <main className="main-shell">
        {chatError && <div className="research-error" role="alert">{chatError}</div>}
        {standalone && (
          <>
            {header}
            {view === "Designsystem" ? (
              <Suspense
                fallback={
                  <p className="page-loading" role="status">
                    Laddar designsystem…
                  </p>
                }
              >
                <DesignSystem dark={dark} onThemeChange={setDark} />
              </Suspense>
            ) : (
              <FeaturePage view={view} dark={dark} />
            )}
          </>
        )}
        <div
          hidden={standalone}
          className={`split-layout ${workspaceOpen ? "" : "workspace-hidden"} mobile-${pane}`}
          ref={split}
          style={
            {
              "--chat-width": `${chatWidth}%`,
              ...(dragWidth !== null
                ? { "--workspace-drag-width": `${dragWidth}px` }
                : {}),
            } as CSSProperties
          }
        >
          <section className="chat-column" aria-label="Samtalsyta">
            {header}
            <div className="mobile-tabs" role="group" aria-label="Panel">
              <Button
                aria-pressed={pane === "chat"}
                onClick={() => setPane("chat")}
              >
                Chatt
              </Button>
              <Button
                aria-pressed={pane === "workspace"}
                onClick={() => {
                  setPane("workspace");
                  setWorkspaceOpen(true);
                }}
              >
                Workspace
              </Button>
            </div>
            {active.id === 'empty' ? <div className="page-loading"><h1>Välkommen till {workspaceName}</h1><p>Starta ett samtal för att börja samla din forskning.</p><Button variant="primary" disabled={creatingChat} onClick={() => void createChat()}>{creatingChat ? 'Skapar…' : 'Starta chatt'}</Button>{onCreateWorkspace && <Button onClick={onCreateWorkspace}>Skapa nytt workspace</Button>}</div> : createRemoteChat ?
              <LiveChat onCreateWorkspace={onCreateWorkspace} key={active.id} thread={active} onChange={updated => setThreads(prev => prev.map(t => t.id === updated.id ? updated : t))} /> :
              <Chat onCreateWorkspace={onCreateWorkspace} key={active.id} thread={active} onChange={updated => setThreads(prev => prev.map(t => t.id === updated.id ? updated : t))} />}
          </section>
          <div
            className="divider"
            role="separator"
            aria-label="Ändra panelbredd"
            aria-orientation="vertical"
            aria-valuenow={workspaceOpen ? Math.round(chatWidth) : 100}
            aria-valuemin={25}
            aria-valuemax={100}
            aria-valuetext={
              workspaceOpen
                ? `Chatt ${Math.round(chatWidth)} procent`
                : "Workspace hopfälld"
            }
            title="Dra för att ändra bredd eller fälla ihop · Enter för att öppna/stänga · Dubbelklicka för att återställa"
            tabIndex={0}
            onKeyDown={(e) => {
              if (["Enter", " ", "Home", "End"].includes(e.key)) {
                e.preventDefault();
                if (e.key === "Home") {
                  setWorkspaceOpen(false);
                  setPane("chat");
                } else if (e.key === "End") {
                  setWorkspaceOpen(true);
                  setChatWidth(48);
                } else toggleWorkspace();
              } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                e.preventDefault();
                if (!workspaceOpen) {
                  if (e.key === "ArrowLeft") setWorkspaceOpen(true);
                  return;
                }
                const next = chatWidth + (e.key === "ArrowRight" ? 2 : -2);
                if (next >= 88) {
                  setWorkspaceOpen(false);
                  setPane("chat");
                } else setChatWidth(Math.min(86, Math.max(25, next)));
              }
            }}
            onDoubleClick={() => {
              setChatWidth(48);
              setWorkspaceOpen(true);
            }}
            onPointerDown={(e) => {
              if (e.button !== 0) return;
              e.preventDefault();
              e.currentTarget.focus();
              e.currentTarget.setPointerCapture(e.pointerId);
              latestDragWidth.current = null;
              split.current?.classList.add("is-resizing");
            }}
            onPointerMove={(e) => {
              if (
                !e.currentTarget.hasPointerCapture(e.pointerId) ||
                !split.current
              )
                return;
              const rect = split.current.getBoundingClientRect();
              const width = Math.min(
                rect.width * 0.75,
                Math.max(64, rect.right - e.clientX),
              );
              latestDragWidth.current = width;
              setDragWidth(width);
              if (width > 132) setWorkspaceOpen(true);
            }}
            onPointerUp={(e) =>
              e.currentTarget.releasePointerCapture(e.pointerId)
            }
            onLostPointerCapture={() => {
              const width = latestDragWidth.current;
              if (width !== null && split.current) {
                const fullWidth = split.current.getBoundingClientRect().width;
                const close = width <= 132;
                setWorkspaceOpen(!close);
                setPane(close ? "chat" : "workspace");
                if (!close)
                  setChatWidth(
                    100 - ((Math.max(300, width) + 1) / fullWidth) * 100,
                  );
              }
              latestDragWidth.current = null;
              split.current?.classList.remove("is-resizing");
              setDragWidth(null);
            }}
          >
            <span className="resize-grip" aria-hidden="true" />
          </div>
          <Workspace
            key={workspaceName}
            workspaceName={workspaceName}
            view={view}
            onView={openView}
            open={workspaceOpen}
            onToggle={toggleWorkspace}
          />
        </div>
      </main>
    </div>
  );
}
function Brand() {
  return (
    <div className="brand">
      <span className="brand-monogram" aria-hidden="true">
        A
      </span>
      <span>
        <strong>OpenCancer</strong>
        <small>Arbetsyta för cancerforskning</small>
      </span>
    </div>
  );
}
