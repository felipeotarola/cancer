import { useEffect, useId, useState } from "react";
import {
  ArrowUpRight,
  Plus,
  Sparkles,
  Check,
  Layers,
  SlidersHorizontal,
  ArrowRight,
} from "lucide-react";
import { Button } from "./ui/Button";
import { Surface } from "./ui/Surface";
import { StatusBadge } from "./ui/StatusBadge";
import { Switch } from "./ui/Switch";
import { Dialog } from "./ui/Dialog";
import { Select } from "./ui/Select";
import { responseStyles } from "../lib/chat";
import "./design-system-page.css";

const swatches = [
  ["Canvas", "--color-canvas"],
  ["Surface", "--color-surface"],
  ["Primary", "--color-primary"],
  ["Accent", "--color-accent"],
  ["Ink", "--color-ink"],
];
const typeStyles = [
  [
    "Display",
    "En tanke kan bli något stort.",
    "type-display",
    "Inter · 32–44 / 1.14 · 600",
  ],
  [
    "Sidtitel",
    "Plats för det som kommer härnäst.",
    "type-title",
    "Inter · 28–34 / 1.2 · 600",
  ],
  ["Rubrik", "Allt har sin plats.", "type-heading", "Inter · 18 / 1.4 · 600"],
  [
    "Brödtext",
    "Små steg, tydliga tankar. En arbetsyta som ger innehållet plats och låter dig fokusera.",
    "type-body",
    "Inter · 15 / 1.65 · 400",
  ],
  [
    "Lästext",
    "En lite större textstil för samtal och längre innehåll. Lugn rytm, tydlig kontrast och utrymme mellan raderna.",
    "type-reading",
    "Inter · 16 / 1.75 · 400",
  ],
  ["Etikett", "Min workspace", "type-label", "Inter · 13 / 1.5 · 500"],
  ["Metadata", "Uppdaterad nyss", "type-caption", "Inter · 12 / 1.5 · 400"],
  [
    "Överrad",
    "DIN PERSONLIGA ARBETSYTA",
    "type-overline",
    "Inter · 11 / 1.5 · 600",
  ],
];

export default function DesignSystem({
  dark,
  onThemeChange,
}: {
  dark: boolean;
  onThemeChange: (dark: boolean) => void;
}) {
  const [tab, setTab] = useState("Komponenter");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("Min nästa idé");
  const [notifications, setNotifications] = useState(true);
  const [toast, setToast] = useState("");
  const [savedName, setSavedName] = useState("Min nästa idé");
  const id = useId();
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3500);
    return () => clearTimeout(timer);
  }, [toast]);
  return (
    <section className="ds-page" aria-label="Designsystem">
      <header className="ds-hero">
        <div className="ds-hero-copy">
          <span className="ds-eyebrow">AGENT WORKSPACE / DESIGN SYSTEM 01</span>
          <h1>
            Ett lugnare sätt
            <br />
            att skapa.
          </h1>
          <p>
            Mjuka ytor. Tydlig typografi. Genomtänkta detaljer.
            <br className="ds-desktop-break" /> Ett gemensamt språk för hela
            arbetsytan.
          </p>
          <div className="ds-hero-actions">
            <Button variant="primary" onClick={() => setDialogOpen(true)}>
              Prova komponenterna
              <ArrowUpRight size={16} />
            </Button>
            <span className="ds-version">Neutral Monochrome · v0.3</span>
          </div>
        </div>
        <div className="ds-orbit" aria-hidden="true">
          <div className="ds-orbit-circle" />
          <div className="ds-orbit-card orbit-one">
            <Layers size={28} />
            <span>Lite mer utrymme.</span>
          </div>
          <div className="ds-orbit-card orbit-two">
            <Sparkles size={24} />
            <span>Lite mer fokus.</span>
          </div>
          <span className="orbit-dot" />
        </div>
      </header>
      <nav className="ds-tabs" aria-label="Designsystemets avsnitt">
        {["Komponenter", "Typografi", "Grunder"].map((item) => (
          <Button
            key={item}
            variant={tab === item ? "primary" : "ghost"}
            aria-pressed={tab === item}
            onClick={() => setTab(item)}
          >
            {item}
          </Button>
        ))}
      </nav>

      {tab === "Komponenter" && (
        <div className="ds-grid">
          <Surface className="ds-specimen">
            <SpecimenTitle
              number="01"
              title="Knappar & handlingar"
              subtitle="En tydlig primär handling. Lugnare alternativ runtomkring."
            />
            <div className="ds-sample-row">
              <Button
                variant="primary"
                onClick={() => setToast("Den primära knappen fungerar.")}
              >
                <Plus size={16} />
                Nytt workspace
              </Button>
              <Button
                variant="secondary"
                onClick={() =>
                  setToast(
                    "Dina ändringar har sparats lokalt i förhandsvisningen.",
                  )
                }
              >
                <Check size={16} />
                Spara ändringar
              </Button>
              <Button onClick={() => setToast("Du kan fortsätta när du vill.")}>
                Avbryt
              </Button>
            </div>
            <div className="ds-sample-row">
              <Button variant="secondary" size="sm">
                Kompakt
              </Button>
              <Button variant="primary" disabled>
                Inaktiverad
              </Button>
              <Button
                variant="danger"
                onClick={() =>
                  setToast(
                    "Exempel på en destruktiv knapp. Ingenting togs bort.",
                  )
                }
              >
                Ta bort
              </Button>
              <Button
                variant="secondary"
                shape="icon"
                aria-label="Exempel: inställningar"
                onClick={() => setToast("Inställningsknapp")}
              >
                <SlidersHorizontal size={17} />
              </Button>
            </div>
            <div className="ds-specimen-note">
              42 px kontrollhöjd · pillform · tydligt tangentbordsfokus
            </div>
          </Surface>
          <Surface className="ds-specimen">
            <SpecimenTitle
              number="02"
              title="Fält & inmatning"
              subtitle="Etiketten stannar kvar. Hjälptexten förklarar nästa steg."
            />
            <div className="ds-form-grid">
              <div>
                <label className="ui-field-label" htmlFor={`${id}-name`}>
                  Workspace-namn
                </label>
                <input
                  id={`${id}-name`}
                  className="ui-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  aria-describedby={`${id}-name-hint`}
                />
                <p id={`${id}-name-hint`} className="ui-field-hint">
                  Ge din idé lite utrymme.
                </p>
              </div>
              <div>
                <label className="ui-field-label" htmlFor={`${id}-role`}>
                  Svarsstil
                </label>
                <Select
                  id={`${id}-role`}
                  defaultValue="Auto"
                  options={responseStyles}
                />
                <p className="ui-field-hint">
                  Samma kontrollfamilj som i chatten.
                </p>
              </div>
            </div>
            <div className="ds-field-states">
              <div>
                <label className="ui-field-label" htmlFor={`${id}-invalid`}>
                  Feltillstånd
                </label>
                <input
                  id={`${id}-invalid`}
                  className="ui-field"
                  aria-invalid="true"
                  aria-describedby={`${id}-error`}
                  placeholder="Skriv ett namn"
                />
                <p id={`${id}-error`} className="ui-field-hint ui-field-error">
                  Exempel: ett namn behövs.
                </p>
              </div>
              <div>
                <label className="ui-field-label" htmlFor={`${id}-disabled`}>
                  Inaktiverat
                </label>
                <input
                  id={`${id}-disabled`}
                  className="ui-field"
                  value="Ej tillgängligt"
                  disabled
                  readOnly
                />
              </div>
            </div>
          </Surface>
          <Surface className="ds-specimen">
            <SpecimenTitle
              number="03"
              title="Status & inställningar"
              subtitle="Färg får en betydelse. Inställningar får tydlig återkoppling."
            />
            <div className="ds-sample-row">
              <StatusBadge>Utkast</StatusBadge>
              <StatusBadge tone="success">
                <Check size={12} />
                Klart
              </StatusBadge>
              <StatusBadge tone="info">Pågår</StatusBadge>
              <StatusBadge tone="warning">Behöver ses över</StatusBadge>
            </div>
            <div className="ds-switches">
              <Switch
                label="Mörkt läge"
                description="Byter färgtema i hela appen."
                checked={dark}
                onChange={onThemeChange}
              />
              <Switch
                label="Notiser"
                description="Interaktivt exempel, sparas bara i denna vy."
                checked={notifications}
                onChange={setNotifications}
              />
            </div>
          </Surface>
          <Surface className="ds-specimen">
            <SpecimenTitle
              number="04"
              title="Kort & dialoger"
              subtitle="Tydliga ytor som låter innehållet andas."
            />
            <div className="ds-workspace-preview">
              <span className="ds-workspace-symbol">
                <Layers size={21} />
              </span>
              <StatusBadge tone="info">Personligt</StatusBadge>
              <h3>{savedName}</h3>
              <p>En plats att samla tankar och göra dem till nästa steg.</p>
              <Button variant="secondary" onClick={() => setDialogOpen(true)}>
                Redigera exempel
                <ArrowRight size={15} />
              </Button>
            </div>
          </Surface>
        </div>
      )}

      {tab === "Typografi" && (
        <Surface className="ds-type-specimen">
          <SpecimenTitle
            number="Aa"
            title="Typografi med en uppgift"
            subtitle="Inter ger rubriker, gränssnitt och längre texter ett gemensamt uttryck med tydlig kontrast."
          />
          <div className="ds-type-list">
            {typeStyles.map(([role, sample, className, metrics]) => (
              <div className="ds-type-row" key={role}>
                <div className="ds-type-meta">
                  <strong>{role}</strong>
                  <span>{metrics}</span>
                </div>
                <p className={className}>{sample}</p>
              </div>
            ))}
          </div>
          <div className="ds-type-footer">
            <p>Å Ä Ö · å ä ö · 0123456789 · “Tydligt, även i detaljerna.”</p>
            <span>
              Responsiva rubriker · optisk skalning · max 65 tecken per textrad
            </span>
          </div>
        </Surface>
      )}

      {tab === "Grunder" && (
        <div className="ds-grid">
          <Surface className="ds-specimen ds-wide">
            <SpecimenTitle
              number="01"
              title="En palett med lite mer lugn"
              subtitle="Varm sten, kritvita ytor och en diskret salviagrön accent."
            />
            <div className="ds-swatches">
              {swatches.map(([label, token]) => (
                <div key={token}>
                  <span
                    className="ds-swatch"
                    style={{ background: `var(${token})` }}
                  />
                  <strong>{label}</strong>
                  <code>{token}</code>
                </div>
              ))}
            </div>
          </Surface>
          <Surface className="ds-specimen">
            <SpecimenTitle
              number="02"
              title="En rytm av utrymme"
              subtitle="Avstånd bygger hierarki lika mycket som textstorlek."
            />
            <div className="ds-spacing">
              {[4, 8, 12, 16, 24, 32, 48].map((size) => (
                <div key={size}>
                  <code>{size}</code>
                  <span style={{ width: `${size * 3}px` }} />
                </div>
              ))}
            </div>
          </Surface>
          <Surface className="ds-specimen">
            <SpecimenTitle
              number="03"
              title="Rundningar & rörelse"
              subtitle="Samma logik i varje del av gränssnittet."
            />
            <div className="ds-radii">
              {[
                ["Kontroll", "var(--radius-control)"],
                ["Panel", "var(--radius-panel)"],
                ["Pill", "var(--radius-pill)"],
              ].map(([label, radius]) => (
                <div key={label}>
                  <span style={{ borderRadius: radius }} />
                  <p>{label}</p>
                </div>
              ))}
            </div>
            <p className="ds-specimen-note">
              160 ms för kontroller · 420 ms för paneler. Respekterar minskad
              rörelse.
            </p>
          </Surface>
        </div>
      )}

      <footer className="ds-page-footer">
        <span>AGENT WORKSPACE</span>
        <p>Utformat för att ge dina tankar mer plats.</p>
        <Sparkles size={16} />
      </footer>
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Plats för en ny idé"
        description="En förhandsvisning av appens gemensamma dialog och formulär."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSavedName(name.trim());
            setDialogOpen(false);
            setToast("Förhandsvisningen är uppdaterad.");
          }}
        >
          <label className="ui-field-label" htmlFor={`${id}-dialog-name`}>
            Workspace-namn
          </label>
          <input
            data-autofocus
            required
            id={`${id}-dialog-name`}
            className="ui-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <p className="ui-field-hint">
            Ändrar bara exempelkortet på den här sidan.
          </p>
          <div className="ui-dialog-actions">
            <Button onClick={() => setDialogOpen(false)}>Avbryt</Button>
            <Button variant="primary" type="submit" disabled={!name.trim()}>
              Spara exempel
              <Check size={16} />
            </Button>
          </div>
        </form>
      </Dialog>
      {toast && (
        <div className="ds-toast" role="status">
          <span>
            <Check size={15} />
          </span>
          {toast}
        </div>
      )}
    </section>
  );
}
function SpecimenTitle({
  number,
  title,
  subtitle,
}: {
  number: string;
  title: string;
  subtitle: string;
}) {
  return (
    <header className="ds-specimen-heading">
      <span>{number}</span>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </header>
  );
}
