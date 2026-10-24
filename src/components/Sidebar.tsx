import { Button } from "./ui/Button";
import { useState } from "react";
import {
  Trash2,
  LayoutGrid,
  Bot,
  Plug,
  House,
  FlaskConical,
  CirclePlus,
  Search,
  MessageSquare,
  SwatchBook,
  type LucideIcon,
} from "lucide-react";
import type { Thread } from "../lib/chat";
import { Select } from "./ui/Select";
const globalLinks: [LucideIcon, string][] = [
  [LayoutGrid, "Alla workspaces"],
  [Bot, "Agenten"],
  [Plug, "Integrationer"],
];
const workspaceLinks: [LucideIcon, string][] = [[House, "Översikt"], [FlaskConical, "Forskning"]];
type Props = {
  workspaces?: { id: string; name: string }[];
  workspaceId?: string;
  onWorkspaceChange?: (id: string) => void;
  onCreateWorkspace?: () => void;
  canCreateWorkspace?: boolean;
  workspaceName?: string;
  creatingChat?: boolean;
  threads: Thread[];
  activeId: string;
  view: string;
  onDelete: (thread: Thread) => void;
  onSelect: (id: string) => void;
  onNew: () => void;
  onView: (view: string) => void;
};
export function Sidebar({
  workspaceName = 'OpenCancer',
  workspaces, workspaceId, onWorkspaceChange, onCreateWorkspace, canCreateWorkspace,
  creatingChat = false,
  threads,
  activeId,
  view,
  onSelect, onDelete,
  onNew,
  onView,
}: Props) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const filtered = threads.filter((t) =>
    t.title.toLocaleLowerCase("sv").includes(query.toLocaleLowerCase("sv")),
  );
  return (
    <nav className="sidebar-nav">
      <section className="nav-group" aria-label="Globalt">
        <h2 className="nav-section-title">Globalt</h2>
        {globalLinks.map(([Icon, label]) => (
          <Button
            key={label}
            className={`nav-link ${view === label ? "active" : ""}`}
            onClick={() => onView(label)}
          >
            <Icon />
            {label}
          </Button>
        ))}
      </section>
      <section className="nav-group" aria-label="Workspace">
        <h2 className="nav-section-title">Workspace</h2>
        <div className="workspace-select">
          <span className="workspace-avatar">A</span>
          <Select
            aria-label="Välj workspace"
            value={workspaceId || "personal"}
            onValueChange={id => {
              if (id === 'create-workspace') onCreateWorkspace?.();
              else onWorkspaceChange?.(id);
            }}
            options={[...(workspaces?.map(w => ({ value: w.id, label: w.name })) || [
              {
                value: "personal",
                label: workspaceName,
                description: "Arbetsyta för cancerforskning",
              },
            ]), ...(canCreateWorkspace ? [{ value: 'create-workspace', label: '＋ Nytt workspace' }] : [])]}
          />
        </div>
        {workspaceLinks.map(([Icon, label]) => (
          <Button
            key={label}
            className={`nav-link ${view === label ? "active" : ""}`}
            onClick={() => onView(label)}
          >
            <Icon />
            {label}
          </Button>
        ))}
      </section>
      <section className="nav-group chat-list" aria-label="Chattar">
        <h2 className="nav-section-title">
          Chattar<span className="summary-count">{threads.length}</span>
        </h2>
        <Button className="nav-link" onClick={onNew} disabled={creatingChat}>
          <CirclePlus />
          Ny chatt
        </Button>
        <Button
          className="nav-link"
          aria-expanded={searching}
          onClick={() => setSearching(!searching)}
        >
          <Search />
          Sök chattar
        </Button>
        {searching && (
          <input
            autoFocus
            className="ui-field search-input"
            aria-label="Sök chattar"
            placeholder="Sök en chatt…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        )}
        <div className="thread-list">
          {filtered.map((t) => (
            <div key={t.id} className="thread-row"><Button
              className={`nav-link thread ${activeId === t.id ? "active" : ""}`}
              aria-current={activeId === t.id ? "page" : undefined}
              onClick={() => onSelect(t.id)}
            >
              <MessageSquare />
              <span>{t.title}</span>
            </Button><Button shape="icon" size="sm" className="thread-delete" aria-label={`Ta bort chatten ${t.title}`} onClick={() => onDelete(t)}><Trash2 size={15} /></Button></div>
          ))}
          {query && !filtered.length && (
            <p className="no-results">Inga chattar hittades.</p>
          )}
        </div>
      </section>
      <div className="sidebar-system">
        <Button
          className={`nav-link ${view === "Designsystem" ? "active" : ""}`}
          onClick={() => onView("Designsystem")}
        >
          <SwatchBook />
          Designsystem
          <span className="sidebar-system-dot" />
        </Button>
      </div>
    </nav>
  );
}
