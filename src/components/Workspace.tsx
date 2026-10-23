import { Button } from "./ui/Button";
import { House, PanelRightOpen, type LucideIcon } from "lucide-react";
import { PanelRail } from "./PanelRail";
import { useEffect, useRef } from "react";
import { WorkspaceFiles } from "./WorkspaceFiles";
const tabs: [LucideIcon, string][] = [[House, "Översikt"]];
export function Workspace({
  workspaceName = 'OpenCancer',
  view,
  onView,
  open,
  onToggle,
}: {
  workspaceName?: string;
  view: string;
  onView: (view: string) => void;
  open: boolean;
  onToggle: () => void;
}) {
  const panel = useRef<HTMLElement>(null);
  const previousOpen = useRef(open);
  useEffect(() => {
    if (
      previousOpen.current !== open &&
      panel.current?.contains(document.activeElement)
    ) {
      panel.current
        .querySelector<HTMLButtonElement>(
          open ? ".workspace-header nav button" : ".rail-toggle",
        )
        ?.focus();
    }
    previousOpen.current = open;
  }, [open]);
  return (
    <aside
      ref={panel}
      className={`workspace-pane ${open ? "is-open" : "is-collapsed"}`}
      aria-label="Workspace"
    >
      <div className="workspace-expanded" inert={!open} aria-hidden={!open}>
        <header className="workspace-header">
          <div className="workspace-heading">
            <span className="workspace-avatar">A</span>
            <span>{workspaceName}</span>
          </div>
          <nav aria-label="Workspace-vyer">
            {tabs.map(([Icon, label]) => (
              <Button
                size="sm"
                key={label}
                className={view === label ? "selected" : ""}
                aria-current={view === label ? "page" : undefined}
                onClick={() => onView(label)}
              >
                <Icon size={15} />
                {label}
              </Button>
            ))}
          </nav>
        </header>
        <div className="workspace-canvas" aria-label={`${view} – arbetsyta`}>
          <div hidden={view !== "Översikt"}>
            <WorkspaceFiles />
          </div>
        </div>
      </div>
      <div className="workspace-rail" inert={open} aria-hidden={open}>
        <PanelRail
          label="Kompakt workspace"
          toggleLabel="Öppna workspace"
          icon={PanelRightOpen}
          onToggle={onToggle}
          items={[
            ...tabs.map(([icon, label]) => ({
              label,
              icon,
              active: view === label,
              onClick: () => onView(label),
            })),
          ]}
        />
      </div>
    </aside>
  );
}
