import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Bookmark, Check, Clock3, FileText, FlaskConical, RefreshCw, Search, Sparkles } from 'lucide-react';
import { api } from '../lib/supabase';
import { Button } from './ui/Button';
import { StatusBadge } from './ui/StatusBadge';
import { recordedActivity, researchDiscussion, researchUrl, type ResearchCatalog, type ResearchTask } from '../../shared/research';
import './ResearchLibrary.css';

type Selection = { task: ResearchTask; revision: string; importedAt: string };
const date = (value: string) => new Date(value).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' });
export function ResearchLibrary({ workspaceId, onDiscuss }: { workspaceId?: string; onDiscuss: (prompt: string) => Promise<void> }) {
  const [catalog, setCatalog] = useState<ResearchCatalog | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(!!workspaceId);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);
  const [selected, setSelected] = useState<Selection | null>(null);
  const endpoint = `/api/research-library?workspaceId=${encodeURIComponent(workspaceId ?? '')}`;
  useEffect(() => {
    if (!workspaceId) return;
    let active = true;
    void api<ResearchCatalog>(endpoint).then(result => { if (active) setCatalog(result); })
      .catch(e => { if (active) { setCatalog(null); setError(e.message); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [workspaceId, endpoint, refresh]);
  function reload() { setSelected(null); setLoading(true); setError(''); setRefresh(n => n + 1); }
  async function save(remove: boolean) {
    if (!selected || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await api(remove ? `${endpoint}&taskId=${selected.task.id}` : '/api/research-library', {
        method: remove ? 'DELETE' : 'POST',
        ...(remove ? {} : { body: JSON.stringify({ workspaceId, taskId: selected.task.id, revision: selected.revision }) }),
      });
      setCatalog(await api<ResearchCatalog>(endpoint));
      setNotice(remove ? 'Referensen har tagits bort från workspacet.' : 'Sparad i workspacet. Uppgiften har inte tilldelats dig.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Kunde inte spara.'); }
    finally { setBusy(false); }
  }
  async function discuss() {
    if (!selected || busy) return;
    setBusy(true); setError('');
    try { await onDiscuss(researchDiscussion(selected.task, selected.revision)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Kunde inte öppna chatten.'); }
    finally { setBusy(false); }
  }
  const snapshot = catalog?.snapshot;
  const items: Selection[] = savedOnly ? (catalog?.saved ?? []).map(s => ({ task: s.task, revision: s.revision, importedAt: s.imported_at }))
    : (snapshot?.tasks ?? []).map(task => ({ task, revision: snapshot!.revision, importedAt: snapshot!.imported_at }));
  const matches = items.filter(({ task }) => `${task.title} ${task.question} ${task.programme}`.toLocaleLowerCase('sv').includes(query.toLocaleLowerCase('sv')));
  const saved = catalog?.saved.find(s => s.task_id === selected?.task.id);
  return <section className="research-library" aria-label="Forskningsbibliotek">
    <div className="research-intro">
      <span className="research-symbol"><FlaskConical size={22} /></span>
      <div><p className="eyebrow">KALIBRERA · FORSKNING</p><h1>Från fråga till underlag</h1><p>Utforska gruppens uppgifter och samla dem i din arbetsyta.</p></div>
    </div>
    {error && <div className="research-feedback" role="alert">{error}<Button size="sm" onClick={reload}>Försök igen</Button></div>}
    {notice && <p className="research-feedback" role="status">{notice}</p>}
    {loading ? <p role="status">Laddar forskningsuppgifter…</p> : !catalog?.snapshot ? (!error && <div className="research-empty"><FlaskConical size={28} /><h2>Här börjar forskningsarbetet</h2><p>Kalibrera har ännu inte anslutits till detta workspace. När uppgifterna har importerats kan ni läsa och spara dem här.</p></div>) : <>
      <div className="research-sync"><span>Importerad {date(snapshot!.imported_at)} · {snapshot!.revision.slice(0, 7)}</span><Button size="sm" shape="icon" aria-label="Läs om forskningsbiblioteket" title="Läs in senast importerade version" disabled={busy} onClick={reload}><RefreshCw size={14} /></Button></div>
      {selected ? <article className="research-detail">
        <Button size="sm" disabled={busy} onClick={() => { setSelected(null); setNotice(''); }}><ArrowLeft size={15} />Alla uppgifter</Button>
        <div className="research-badges"><StatusBadge tone="info">E0 · extern granskning återstår</StatusBadge><StatusBadge>{recordedActivity(selected.task)}</StatusBadge></div>
        <h2>{selected.task.title}</h2><p className="research-question">{selected.task.question}</p>
        <div className="research-actions"><Button variant="primary" disabled={busy} onClick={() => void discuss()}><Sparkles size={15} />{busy ? 'Vänta…' : 'Diskutera med Luna'}</Button><Button variant="secondary" disabled={busy || !!saved} onClick={() => void save(false)}>{saved ? <Check size={15} /> : <Bookmark size={15} />}{saved ? 'Sparad i workspace' : 'Lägg till i workspace'}</Button></div>
        <p className="research-hint">Öppnar en ny privat chatt med ett utkast och uppgiftens underlag. Du skickar när du är redo.</p>
        {saved && saved.revision !== selected.revision && <p className="research-feedback">Den sparade referensen gäller version {saved.revision.slice(0, 7)}. <Button size="sm" onClick={() => setSelected({ task: saved.task, revision: saved.revision, importedAt: saved.imported_at })}>Visa sparad version</Button></p>}
        <dl className="research-facts"><div><dt>Program</dt><dd>{selected.task.programme}</dd></div><div><dt>Avsedd för</dt><dd>{selected.task.intended_user}</dd></div><div><dt>Uppskattad insats</dt><dd>{selected.task.estimated_hours} timmar</dd></div><div><dt>Underlag</dt><dd>{({ synthetic: 'Syntetiska data', committed_aggregate: 'Befintliga aggregat', reviewed_public: 'Publika källor – kontrollera villkor' } as Record<string, string>)[selected.task.data_mode] ?? selected.task.data_mode}</dd></div></dl>
        <Detail title="Varför uppgiften behövs"><p>{selected.task.rationale}</p></Detail>
        <Detail title="Metod"><p>{selected.task.method}</p></Detail>
        <Detail title="När arbetet är klart"><ul>{selected.task.acceptance.map((s, i) => <li key={i}>{s}</li>)}</ul></Detail>
        <Detail title="Avgränsning och stoppvillkor"><ul>{selected.task.stop_conditions.map((s, i) => <li key={i}>{s}</li>)}</ul></Detail>
        {(selected.task.blockers.length > 0 || selected.task.dependencies.length > 0) && <Detail title="Blockerare och beroenden"><ul>{selected.task.blockers.map((s, i) => <li key={i}>{s}</li>)}{selected.task.dependencies.map(id => <li key={id}><a target="_blank" rel="noopener noreferrer" href={researchUrl(selected.revision, `research/tasks/${id}.json`)}>{snapshot?.tasks.find(t => t.id === id)?.title ?? id}</a></li>)}</ul></Detail>}
        <Detail title="Tillåtna underlag">{selected.task.inputs.length ? <ul className="research-files">{selected.task.inputs.map(file => <li key={file.path}><a target="_blank" rel="noopener noreferrer" href={researchUrl(selected.revision, file.path)}><FileText size={15} />{file.path}<ArrowUpRight size={14} /></a><small>SHA-256: {file.sha256}</small></li>)}</ul> : <p>Inga filer angivna i uppgiften.</p>}{selected.task.source_slugs.length > 0 && <p>Källor: {selected.task.source_slugs.join(', ')}. Angivna källor är inte i sig ett tillstånd att hämta data.</p>}</Detail>
        <Detail title="Resultat och granskningar">{selected.task.events.length ? <ol className="research-events">{selected.task.events.map(event => <li key={event.id}><strong>{event.kind} {event.role ?? ''}</strong><small>{date(event.at)} · {event.actor}</small><p>{event.note}</p>{event.artefacts?.map(file => <a key={file.path} target="_blank" rel="noopener noreferrer" href={researchUrl(selected.revision, file.path)}>{file.path}<ArrowUpRight size={14} /></a>)}</li>)}</ol> : <p>Inga resultat eller granskningar har registrerats i den här versionen.</p>}</Detail>
        <footer className="research-source"><a target="_blank" rel="noopener noreferrer" href={researchUrl(selected.revision, `research/tasks/${selected.task.id}.json`)}>Öppna originalet i Kalibrera <ArrowUpRight size={14} /></a><p>Version {selected.revision.slice(0, 7)} · importerad {date(selected.importedAt)}. Källtext visas på originalspråket. GitHub-länkar kräver tillgång till repot.</p>{saved && <Button size="sm" disabled={busy} onClick={() => void save(true)}>Ta bort referensen från workspace</Button>}</footer>
      </article> : <>
        <div className="research-filter" role="group" aria-label="Visa uppgifter"><Button size="sm" variant={!savedOnly ? 'secondary' : 'ghost'} aria-pressed={!savedOnly} onClick={() => setSavedOnly(false)}>Alla uppgifter <span>{snapshot!.tasks.length}</span></Button><Button size="sm" variant={savedOnly ? 'secondary' : 'ghost'} aria-pressed={savedOnly} onClick={() => setSavedOnly(true)}><Bookmark size={14} />Sparade <span>{catalog.saved.length}</span></Button></div>
        <label className="research-search"><Search size={16} /><span className="sr-only">Sök forskningsuppgifter</span><input className="ui-field" placeholder="Sök fråga eller forskningsområde…" value={query} onChange={e => setQuery(e.target.value)} /></label>
        <div className="research-cards">{matches.map(item => <button className="research-card" key={item.task.id} onClick={() => { setSelected(item); setNotice(''); }}><span className="research-card-top"><span>{item.task.programme}</span>{catalog.saved.some(s => s.task_id === item.task.id) ? <Bookmark size={16} aria-label="Sparad" /> : <ArrowUpRight size={16} />}</span><h2>{item.task.title}</h2><p>{item.task.question}</p><span className="research-card-bottom"><StatusBadge tone={item.task.blockers.length ? 'warning' : 'neutral'}>{recordedActivity(item.task)}</StatusBadge><span><Clock3 size={13} />{item.task.estimated_hours} h</span></span></button>)}</div>
        {!matches.length && <p className="research-empty">{query ? 'Inga uppgifter matchar sökningen.' : 'Inga sparade uppgifter ännu. Öppna en uppgift och lägg till den i workspacet.'}</p>}
        <p className="research-hint">Visar importerade uppgifter och senast registrerade händelser. Aktuell tilldelning och behörighet att starta arbete kontrolleras i Kalibrera. E0: extern vetenskaplig granskning återstår.</p>
      </>}
    </>}
  </section>;
}
function Detail({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="research-section"><h3>{title}</h3>{children}</section>;
}
