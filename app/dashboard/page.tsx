"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { calculateDashboardSummary, type ReportingPeriod } from "../../lib/dashboard-summary";
import { emissionsFactors } from "../../lib/emissions";

type Utility = "Electricity" | "Gas" | "Water";

type UsageRecord = {
  id: number;
  date: string;
  category: Utility;
  amount: number;
  unit: string;
  cost: number;
  source: "Manual" | "Demo data" | "Utility sync" | "CSV import";
};

type Session = {
  authenticated: boolean;
  mode: "demo" | "personal";
  user: { email: string; displayName: string } | null;
};

type ImportPreview = {
  rows: Array<{ date: string; category: string; amount: number; costCents: number }>;
  errors: Array<{ row: number; message: string }>;
  totalRows: number;
};

const signInPath = "/signin-with-chatgpt?return_to=%2Fdashboard";

function comparisonLabel(change: number | null) {
  if (change === null) return { className: "", text: "No previous data" };
  if (Math.abs(change) < 0.05) return { className: "", text: "No change" };
  return {
    className: change < 0 ? "positive" : "negative",
    text: `${Math.abs(change).toFixed(1)}% ${change < 0 ? "lower" : "higher"}`,
  };
}

export default function Home() {
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [savingRecord, setSavingRecord] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState("");
  const [period, setPeriod] = useState<ReportingPeriod>("current");
  const [session, setSession] = useState<Session>({ authenticated: false, mode: "demo", user: null });
  const [showImport, setShowImport] = useState(false);
  const [importCsv, setImportCsv] = useState("");
  const [importFileName, setImportFileName] = useState("");
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);

  const summary = useMemo(() => calculateDashboardSummary(records, period), [records, period]);
  const electricityComparison = comparisonLabel(summary.electricity.changePercent);
  const waterComparison = comparisonLabel(summary.water.changePercent);
  const gasComparison = comparisonLabel(summary.gas.changePercent);
  const emissionsComparison = comparisonLabel(summary.emissions.changePercent);
  const achievedReduction = summary.electricity.changePercent === null
    ? null
    : Math.max(0, -summary.electricity.changePercent);

  useEffect(() => {
    const controller = new AbortController();

    async function loadRecords() {
      try {
        const [recordsResponse, sessionResponse] = await Promise.all([
          fetch("/api/usage-records", { signal: controller.signal }),
          fetch("/api/session", { signal: controller.signal }),
        ]);
        const data = await recordsResponse.json() as { records?: UsageRecord[]; error?: string };
        const sessionData = await sessionResponse.json() as Session;
        if (!recordsResponse.ok || !data.records) throw new Error(data.error ?? "Usage records could not be loaded.");
        if (!sessionResponse.ok) throw new Error("Account status could not be loaded.");
        setRecords(data.records);
        setSession(sessionData);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setNotice(error instanceof Error ? error.message : "Usage records could not be loaded.");
      } finally {
        if (!controller.signal.aborted) setLoadingRecords(false);
      }
    }

    loadRecords();
    return () => controller.abort();
  }, []);

  async function addRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session.authenticated) {
      window.location.assign(signInPath);
      return;
    }
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const category = form.get("category") as Utility;
    const amount = Number(form.get("amount"));
    const cost = Number(form.get("cost"));

    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(cost) || cost < 0) {
      setNotice("Check the usage and cost fields. Usage must be greater than zero.");
      return;
    }

    setSavingRecord(true);
    setNotice("");

    try {
      const response = await fetch("/api/usage-records", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          date: String(form.get("date")),
          category,
          amount,
          cost,
        }),
      });
      const data = await response.json() as { record?: UsageRecord; error?: string };
      if (!response.ok || !data.record) throw new Error(data.error ?? "The record could not be saved.");

      setRecords((current) => [data.record!, ...current]);
      setNotice("Record saved to the GreenMeter database.");
      formElement.reset();
      setShowForm(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The record could not be saved.");
    } finally {
      setSavingRecord(false);
    }
  }

  async function previewImport(file: File) {
    setImportFileName(file.name);
    setImportPreview(null);
    setNotice("");

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setNotice("Choose a .csv file using the GreenMeter template.");
      return;
    }

    const csv = await file.text();
    setImportCsv(csv);
    setImporting(true);
    try {
      const response = await fetch("/api/usage-records/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csv, confirm: false }),
      });
      const data = await response.json() as ImportPreview & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "The CSV could not be previewed.");
      setImportPreview(data);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The CSV could not be previewed.");
    } finally {
      setImporting(false);
    }
  }

  async function confirmImport() {
    if (!importPreview || importPreview.errors.length > 0 || importPreview.rows.length === 0) return;
    setImporting(true);
    setNotice("");
    try {
      const response = await fetch("/api/usage-records/import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ csv: importCsv, confirm: true }),
      });
      const data = await response.json() as { imported?: number; records?: UsageRecord[]; error?: string };
      if (!response.ok || !data.records) throw new Error(data.error ?? "The CSV could not be imported.");
      setRecords(data.records);
      setNotice(`${data.imported} records imported successfully.`);
      setShowImport(false);
      setImportCsv("");
      setImportFileName("");
      setImportPreview(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The CSV could not be imported.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <div className="header-inner">
          <Link className="brand" href="/" aria-label="GreenMeter home">
            <span className="meter-logo" aria-hidden="true"><i /></span>
            <span>Green</span><span>Meter</span>
          </Link>
          <nav className="main-nav" aria-label="Primary navigation">
            <a className="active" href="#overview">Overview</a>
            <a href="#usage">Usage</a>
            <a href="#records">Records</a>
            <a href="#recommendations">Recommendations</a>
          </nav>
          <div className="account-area">
            <button className="help-button">Help</button>
            {session.authenticated ? (
              <a className="account-button" href="/signout-with-chatgpt?return_to=%2F" aria-label="Sign out">
                <span>{session.user?.displayName.slice(0, 2).toUpperCase()}</span><span className="account-name">{session.user?.displayName}</span><span>Sign out</span>
              </a>
            ) : <a className="header-sign-in" href={signInPath}>Sign in</a>}
          </div>
        </div>
      </header>

      <main className="page" id="overview">
        {session.mode === "demo" && (
          <section className="demo-notice" aria-label="Demonstration mode">
            <div><strong>Exploring the public demo</strong><span>This household is read-only. Sign in to create a private workspace and save your own readings.</span></div>
            <a href={signInPath}>Sign in to start</a>
          </section>
        )}
        <section className="page-heading">
          <div>
            <div className="breadcrumbs">Home <span>/</span> {session.mode === "demo" ? "Demonstration household" : "My household"}</div>
            <h1>Energy overview</h1>
            <p>Usage, cost, and emissions estimates for this billing cycle.</p>
          </div>
          <div className="page-controls">
            <label htmlFor="period">Reporting period</label>
            <select id="period" value={period} onChange={(event) => setPeriod(event.target.value as ReportingPeriod)}>
              <option value="current">Latest recorded month</option>
              <option value="previous">Previous month</option>
              <option value="last12">Last 12 months</option>
            </select>
          </div>
        </section>

        <section className="billing-strip" aria-label="Billing cycle status">
          <div>
            <span className="status-dot" />
            <div><strong>{summary.periodLabel}</strong><span>{summary.dateRangeLabel} · {summary.daysRecorded} days reported</span></div>
          </div>
          <div className="billing-progress" aria-label={`${summary.reportingProgress.toFixed(0)} percent of days have readings`}><span style={{ width: `${summary.reportingProgress}%` }} /></div>
          <div className="bill-estimate"><span>Recorded cost</span><strong>${summary.totalCost.toFixed(2)}</strong></div>
        </section>

        <section className="impact-note" aria-label="Current sustainability insight">
          <div className="impact-number">{summary.emissions.totalKg.toLocaleString()}<span>kg</span></div>
          <div><strong>Estimated household emissions</strong><p>Calculated from recorded electricity and natural-gas usage for this period.</p></div>
          <a href="#emissions-method">See methodology <span aria-hidden="true">→</span></a>
        </section>

        <section className="summary-grid" aria-label="Utility summary">
          <article className="summary-card">
            <div className="summary-label"><span className="utility-mark electricity" />Electricity</div>
            <div className="summary-value">{summary.electricity.amount.toLocaleString()} <small>{summary.electricity.unit}</small></div>
            <div className="summary-meta"><span className={electricityComparison.className}>{electricityComparison.text}</span><span>{summary.electricity.changePercent === null ? "" : "than prior period"}</span></div>
          </article>
          <article className="summary-card">
            <div className="summary-label"><span className="utility-mark water" />Water</div>
            <div className="summary-value">{summary.water.amount.toLocaleString()} <small>{summary.water.unit}</small></div>
            <div className="summary-meta"><span className={waterComparison.className}>{waterComparison.text}</span><span>{summary.water.changePercent === null ? "" : "than prior period"}</span></div>
          </article>
          <article className="summary-card">
            <div className="summary-label"><span className="utility-mark gas" />Natural gas</div>
            <div className="summary-value">{summary.gas.amount.toLocaleString()} <small>{summary.gas.unit}</small></div>
            <div className="summary-meta"><span className={gasComparison.className}>{gasComparison.text}</span><span>{summary.gas.changePercent === null ? "" : "than prior period"}</span></div>
          </article>
          <article className="summary-card">
            <div className="summary-label">Estimated emissions</div>
            <div className="summary-value">{summary.emissions.totalKg.toLocaleString()} <small>kg CO₂e</small></div>
            <div className="summary-meta"><span className={emissionsComparison.className}>{emissionsComparison.text}</span><span>{summary.emissions.changePercent === null ? "" : "than prior period"}</span></div>
          </article>
        </section>

        <section className="content-grid" id="usage">
          <article className="card usage-card">
            <div className="card-header">
              <div><h2>Electricity usage</h2><p>Recorded consumption for {summary.dateRangeLabel}</p></div>
              <div className="legend"><span /><span>Recorded usage</span><i />Period average</div>
            </div>
            <div className="chart-summary">
              <div><span>Period total</span><strong>{summary.electricity.amount.toLocaleString()} kWh</strong></div>
              <div><span>Recorded-day average</span><strong>{summary.electricityAverage === null ? "—" : `${summary.electricityAverage} kWh`}</strong></div>
              <div><span>Highest recorded day</span><strong>{summary.electricityHighest === null ? "—" : `${summary.electricityHighest} kWh`}</strong></div>
            </div>
            <div className="chart" aria-label={`Electricity consumption for ${summary.dateRangeLabel}`}>
              <div className="axis-labels"><span>{summary.chartMaximum}</span><span>{Math.round(summary.chartMaximum * .67)}</span><span>{Math.round(summary.chartMaximum * .33)}</span><span>0</span></div>
              <div className="chart-plot">
                {summary.electricityAverage !== null && <div className="average-line" style={{ bottom: `${(summary.electricityAverage / summary.chartMaximum) * 100}%` }}><span>Average {summary.electricityAverage}</span></div>}
                {summary.electricityDays.length === 0 && <div className="chart-empty">No electricity readings for this period</div>}
                {summary.electricityDays.map((day) => (
                  <div className="chart-column" key={day.date}>
                    <div className="chart-bar" style={{ height: `${(day.amount / summary.chartMaximum) * 100}%` }} title={`${day.label}: ${day.amount} kWh`} />
                    <small>{day.label}</small>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <aside className="side-stack">
            <article className="card goal-card">
              <div className="card-header compact"><div><h2>Monthly target</h2><p>10% electricity reduction</p></div>{achievedReduction !== null && <span className="status-badge">{achievedReduction >= 10 ? "Reached" : "In progress"}</span>}</div>
              <div className="target-row"><strong>{achievedReduction === null ? "—" : `${achievedReduction.toFixed(1)}%`}</strong><span>{achievedReduction === null ? "Previous-period data needed" : "reduction achieved"}</span></div>
              <div className="progress-track"><span style={{ width: `${achievedReduction === null ? 0 : Math.min(100, achievedReduction * 10)}%` }} /></div>
              <div className="target-scale"><span>0%</span><span>Target: 10%</span></div>
            </article>
            <article className="card emissions-card" id="emissions-method">
              <h2>How this estimate works</h2>
              <p><strong>{summary.emissions.electricityKg} kg</strong> from electricity plus <strong>{summary.emissions.gasKg} kg</strong> from natural-gas combustion. Water is excluded because no water emissions factor is configured.</p>
              <div className="factor-list">
                <a href={emissionsFactors.electricity.sourceUrl} target="_blank" rel="noreferrer"><span>Electricity</span><strong>{emissionsFactors.electricity.value.toFixed(3)} kg/kWh</strong><small>{emissionsFactors.electricity.region} · {emissionsFactors.electricity.dataYear}</small></a>
                <a href={emissionsFactors.naturalGas.sourceUrl} target="_blank" rel="noreferrer"><span>Natural gas</span><strong>{emissionsFactors.naturalGas.value.toFixed(3)} kg/therm</strong><small>{emissionsFactors.naturalGas.sourceName}</small></a>
              </div>
              <p className="method-note">Estimates use EPA defaults and are not utility-certified measurements.</p>
            </article>
          </aside>
        </section>

        <section className="card recommendations" id="recommendations">
          <div className="card-header"><div><h2>Usage observations</h2><p>Based on the records available for the selected period</p></div></div>
          <div className="recommendation-list">
            <div className="recommendation-row">
              <span className={`recommendation-type ${summary.electricity.changePercent !== null && summary.electricity.changePercent > 0 ? "alert" : ""}`}>{summary.electricity.changePercent === null ? "Status" : "Trend"}</span>
              <div><strong>{summary.electricity.changePercent === null ? "More history is needed" : summary.electricity.changePercent > 0 ? "Electricity usage increased" : "Electricity usage decreased"}</strong><p>{summary.electricity.changePercent === null ? "Add readings for an earlier month to unlock period-over-period comparisons." : `Recorded electricity usage is ${Math.abs(summary.electricity.changePercent).toFixed(1)}% ${summary.electricity.changePercent > 0 ? "higher" : "lower"} than the prior period.`}</p></div>
              <button className="secondary-button" onClick={() => document.querySelector("#records")?.scrollIntoView()}>Review records</button>
            </div>
            <div className="recommendation-row">
              <span className="recommendation-type">Tip</span>
              <div><strong>Consistent readings improve comparisons</strong><p>Record each utility on the same schedule so monthly totals represent similar time spans.</p></div>
              {session.authenticated
                ? <button className="secondary-button" onClick={() => setShowForm(true)}>Add reading</button>
                : <a className="secondary-button" href={signInPath}>Sign in to add</a>}
            </div>
          </div>
        </section>

        <section className="card records-card" id="records">
          <div className="card-header">
            <div><h2>Recent usage records</h2><p>Demonstration and manually entered utility readings</p></div>
            {session.authenticated ? (
              <div className="record-actions">
                <button className="secondary-button" onClick={() => { setShowImport((current) => !current); setShowForm(false); }}>{showImport ? "Close import" : "Import CSV"}</button>
                <button className="primary-button" onClick={() => { setShowForm((current) => !current); setShowImport(false); }}>{showForm ? "Cancel" : "Add record"}</button>
              </div>
            ) : <a className="primary-button" href={signInPath}>Sign in to add records</a>}
          </div>
          {showImport && (
            <section className="import-panel" aria-label="Import utility records">
              <div className="import-copy">
                <strong>Import utility history</strong>
                <p>Use columns <code>date, utility, usage, cost</code>. Dates must use YYYY-MM-DD; utility must be electricity, gas, or water.</p>
                <a href="/greenmeter-import-template.csv" download>Download CSV template</a>
              </div>
              <label className="file-picker">
                <span>{importFileName || "Choose a CSV file"}</span>
                <input type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) void previewImport(file); }} />
              </label>
              {importing && <p className="import-status" role="status">Checking file…</p>}
              {importPreview && (
                <div className={`import-result ${importPreview.errors.length ? "has-errors" : ""}`}>
                  <strong>{importPreview.errors.length ? `${importPreview.errors.length} issues found` : `${importPreview.rows.length} records ready to import`}</strong>
                  <span>{importPreview.totalRows} data rows checked</span>
                  {importPreview.errors.length > 0 && <ul>{importPreview.errors.slice(0, 8).map((error, index) => <li key={`${error.row}-${index}`}>Row {error.row}: {error.message}</li>)}</ul>}
                  {importPreview.errors.length === 0 && <button className="primary-button" disabled={importing} onClick={() => void confirmImport()}>{importing ? "Importing…" : `Import ${importPreview.rows.length} records`}</button>}
                </div>
              )}
            </section>
          )}
          {showForm && (
            <form className="record-form" onSubmit={addRecord}>
              <label>Date<input name="date" type="date" defaultValue="2026-10-03" required /></label>
              <label>Utility<select name="category"><option>Electricity</option><option>Gas</option><option>Water</option></select></label>
              <label>Usage<input name="amount" type="number" min="0.01" step="0.01" placeholder="18.5" required /></label>
              <label>Cost ($)<input name="cost" type="number" min="0" step="0.01" placeholder="2.63" required /></label>
              <button className="primary-button" type="submit" disabled={savingRecord}>{savingRecord ? "Saving…" : "Save record"}</button>
            </form>
          )}
          {notice && <p className="notice" role="status">{notice}</p>}
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Utility</th><th>Usage</th><th>Cost</th><th>Source</th></tr></thead>
              <tbody>
                {loadingRecords && <tr><td className="table-message" colSpan={5}>Loading usage records…</td></tr>}
                {!loadingRecords && records.length === 0 && <tr><td className="table-message" colSpan={5}>No readings yet. Add your first usage record.</td></tr>}
                {records.slice(0, 6).map((record) => (
                  <tr key={record.id}>
                    <td>{new Date(`${record.date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                    <td><span className={`utility-mark ${record.category.toLowerCase()}`} />{record.category}</td>
                    <td>{record.amount} {record.unit}</td><td>${record.cost.toFixed(2)}</td><td><span className="source-badge">{record.source}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <footer><span>GreenMeter</span><span>Usage and emissions are estimates based on recorded utility data.</span></footer>
      </main>
    </div>
  );
}
