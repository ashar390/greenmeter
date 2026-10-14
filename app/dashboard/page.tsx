"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { calculateDashboardSummary, type ReportingPeriod } from "../../lib/dashboard-summary";
import { egridRegions, electricityFactorFor, emissionsFactors, waterSources, type EgridRegionCode, type WaterSource } from "../../lib/emissions";

type Utility = "Electricity" | "Gas" | "Water";

type UsageRecord = {
  id: number;
  date: string;
  category: Utility;
  amount: number;
  unit: string;
  cost: number;
  source: "Manual" | "Demo data" | "Utility sync" | "CSV import" | "Green Button";
};

type AccountSession = {
  authenticated: boolean;
  mode: "demo" | "personal";
  user: { email: string; displayName: string } | null;
};

type ImportPreview = {
  rows: Array<{ date: string; category: string; amount: number; costCents: number }>;
  errors: Array<{ row?: number; entry?: number; message: string }>;
  warnings?: string[];
  totalIntervals?: number;
  totalRows: number;
};

type ImportFormat = "csv" | "green_button";

type HouseholdSettings = {
  city: string;
  stateCode: string;
  postalCode: string;
  egridSubregion: EgridRegionCode;
  waterSource: WaterSource;
};

const defaultHouseholdSettings: HouseholdSettings = {
  city: "",
  stateCode: "",
  postalCode: "",
  egridSubregion: "AZNM",
  waterSource: "local_surface",
};

const signInPath = "/sign-in";

function comparisonLabel(change: number | null) {
  if (change === null) return { className: "", text: "No previous data" };
  if (Math.abs(change) < 0.05) return { className: "", text: "No change" };
  return {
    className: change < 0 ? "positive" : "negative",
    text: `${Math.abs(change).toFixed(1)}% ${change < 0 ? "lower" : "higher"}`,
  };
}

function UtilityIcon({ utility }: { utility: Utility }) {
  if (utility === "Electricity") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 2 5.8 13h5.1L10 22l8.2-12h-5.4l.4-8Z" /></svg>;
  if (utility === "Water") return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8S5.7 9.7 5.7 14.2a6.3 6.3 0 0 0 12.6 0C18.3 9.7 12 2.8 12 2.8Z" /></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.8 2.5c.5 3.6-2.7 4.8-2.7 7.5 0 1.3.8 2.2 1.8 2.8-.2-2.2 1.7-3.6 3-5.5 1.7 2.1 3 4.4 3 7.2A6.8 6.8 0 0 1 5.3 14c0-3.9 2.5-6.6 8.5-11.5Z" /></svg>;
}

export default function Home() {
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [savingRecord, setSavingRecord] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState("");
  const [period, setPeriod] = useState<ReportingPeriod>("current");
  const [session, setSession] = useState<AccountSession>({ authenticated: false, mode: "demo", user: null });
  const [showImport, setShowImport] = useState(false);
  const [importFormat, setImportFormat] = useState<ImportFormat>("csv");
  const [importContents, setImportContents] = useState("");
  const [importFileName, setImportFileName] = useState("");
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [householdSettings, setHouseholdSettings] = useState(defaultHouseholdSettings);
  const [showHouseholdSettings, setShowHouseholdSettings] = useState(false);
  const [savingHousehold, setSavingHousehold] = useState(false);
  const [chartUtility, setChartUtility] = useState<Utility>("Electricity");

  const summary = useMemo(() => calculateDashboardSummary(records, period, {
    region: householdSettings.egridSubregion,
    waterSource: householdSettings.waterSource,
  }), [records, period, householdSettings.egridSubregion, householdSettings.waterSource]);
  const electricityComparison = comparisonLabel(summary.electricity.changePercent);
  const waterComparison = comparisonLabel(summary.water.changePercent);
  const gasComparison = comparisonLabel(summary.gas.changePercent);
  const emissionsComparison = comparisonLabel(summary.emissions.changePercent);
  const achievedReduction = summary.electricity.changePercent === null
    ? null
    : Math.max(0, -summary.electricity.changePercent);
  const chartSeries = summary.utilityDays[chartUtility];
  const chartTotal = chartUtility === "Electricity" ? summary.electricity : chartUtility === "Water" ? summary.water : summary.gas;
  const chartAverage = summary.utilityAverages[chartUtility];
  const chartHighest = summary.utilityHighest[chartUtility];
  const chartMaximum = summary.utilityChartMaximum[chartUtility];

  useEffect(() => {
    const controller = new AbortController();

    async function loadRecords() {
      try {
        const [recordsResponse, sessionResponse] = await Promise.all([
          fetch("/api/usage-records", { signal: controller.signal }),
          fetch("/api/session", { signal: controller.signal }),
        ]);
        const data = await recordsResponse.json() as { records?: UsageRecord[]; error?: string };
        const sessionData = await sessionResponse.json() as AccountSession;
        if (!recordsResponse.ok || !data.records) throw new Error(data.error ?? "Usage records could not be loaded.");
        if (!sessionResponse.ok) throw new Error("Account status could not be loaded.");
        setRecords(data.records);
        setSession(sessionData);
        if (sessionData.authenticated) {
          const householdResponse = await fetch("/api/household", { signal: controller.signal });
          const householdData = await householdResponse.json() as { settings?: HouseholdSettings; error?: string };
          if (!householdResponse.ok || !householdData.settings) throw new Error(householdData.error ?? "Household settings could not be loaded.");
          setHouseholdSettings(householdData.settings);
        }
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

    const expectedExtension = importFormat === "csv" ? ".csv" : ".xml";
    if (!file.name.toLowerCase().endsWith(expectedExtension)) {
      setNotice(importFormat === "csv"
        ? "Choose a .csv file using the GreenMeter template."
        : "Choose a .xml Green Button usage-data export.");
      return;
    }

    const contents = await file.text();
    setImportContents(contents);
    setImporting(true);
    try {
      const response = await fetch(importFormat === "csv" ? "/api/usage-records/import" : "/api/usage-records/import-green-button", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(importFormat === "csv" ? { csv: contents, confirm: false } : { xml: contents, confirm: false }),
      });
      const data = await response.json() as ImportPreview & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "The utility file could not be previewed.");
      setImportPreview(data);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The utility file could not be previewed.");
    } finally {
      setImporting(false);
    }
  }

  async function confirmImport() {
    if (!importPreview || importPreview.errors.length > 0 || importPreview.rows.length === 0) return;
    setImporting(true);
    setNotice("");
    try {
      const response = await fetch(importFormat === "csv" ? "/api/usage-records/import" : "/api/usage-records/import-green-button", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(importFormat === "csv"
          ? { csv: importContents, confirm: true }
          : { xml: importContents, confirm: true }),
      });
      const data = await response.json() as { imported?: number; records?: UsageRecord[]; error?: string };
      if (!response.ok || !data.records) throw new Error(data.error ?? "The utility file could not be imported.");
      setRecords(data.records);
      setNotice(`${data.imported} records imported successfully.`);
      setShowImport(false);
      setImportContents("");
      setImportFileName("");
      setImportPreview(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The utility file could not be imported.");
    } finally {
      setImporting(false);
    }
  }

  async function saveHouseholdSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSavingHousehold(true);
    setNotice("");
    try {
      const response = await fetch("/api/household", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          city: String(form.get("city")),
          stateCode: String(form.get("stateCode")),
          postalCode: String(form.get("postalCode")),
          egridSubregion: String(form.get("egridSubregion")),
          waterSource: String(form.get("waterSource")),
        }),
      });
      const data = await response.json() as { settings?: HouseholdSettings; error?: string };
      if (!response.ok || !data.settings) throw new Error(data.error ?? "Household settings could not be saved.");
      setHouseholdSettings(data.settings);
      setShowHouseholdSettings(false);
      setNotice("Household location and regional factors updated.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Household settings could not be saved.");
    } finally {
      setSavingHousehold(false);
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
              <><button className="location-button" type="button" onClick={() => setShowHouseholdSettings((current) => !current)}>Household</button><button className="account-button" type="button" onClick={() => signOut({ callbackUrl: "/" })} aria-label="Sign out">
                <span>{session.user?.displayName.slice(0, 2).toUpperCase()}</span><span className="account-name">{session.user?.displayName}</span><span>Sign out</span>
              </button></>
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
        {session.authenticated && showHouseholdSettings && (
          <section className="household-settings" aria-label="Household location settings">
            <div className="settings-intro"><span>Household profile</span><h2>Location and calculation factors</h2><p>GreenMeter uses your confirmed EPA grid region for electricity and water estimates. Your location remains private to your account.</p></div>
            <form onSubmit={saveHouseholdSettings}>
              <div className="location-fields">
                <label>City<input name="city" defaultValue={householdSettings.city} placeholder="Tempe" required /></label>
                <label>State<input name="stateCode" defaultValue={householdSettings.stateCode} placeholder="AZ" minLength={2} maxLength={2} required /></label>
                <label>ZIP code<input name="postalCode" defaultValue={householdSettings.postalCode} placeholder="85281" inputMode="numeric" pattern="[0-9]{5}" required /></label>
              </div>
              <label>EPA eGRID region<select name="egridSubregion" defaultValue={householdSettings.egridSubregion}>{Object.entries(egridRegions).map(([code, region]) => <option key={code} value={code}>{code} — {region.name}</option>)}</select><small>Confirm your region with EPA Power Profiler using your ZIP code and electricity provider.</small></label>
              <label>Primary water supply<select name="waterSource" defaultValue={householdSettings.waterSource}>{Object.entries(waterSources).map(([code, source]) => <option key={code} value={code}>{source.name} · {source.range}</option>)}</select><small>DOE generalized energy ranges; this estimates supply, treatment, and distribution rather than household water heating.</small></label>
              <div className="settings-actions"><a href="https://www.epa.gov/egrid/power-profiler" target="_blank" rel="noreferrer">Open EPA Power Profiler</a><button className="primary-button" type="submit" disabled={savingHousehold}>{savingHousehold ? "Saving…" : "Save household"}</button></div>
            </form>
          </section>
        )}
        <section className="dashboard-filter-row" aria-label="Dashboard controls">
          <div><span className="status-dot" /><div><strong>{session.mode === "demo" ? "Demonstration household" : "My household"}</strong><span>{summary.daysRecorded} days with recorded activity</span></div></div>
          <div className="page-controls">
            <label htmlFor="period">Reporting period <span>{summary.dateRangeLabel}</span></label>
            <select id="period" value={period} onChange={(event) => setPeriod(event.target.value as ReportingPeriod)}>
              <option value="current">Latest recorded month</option>
              <option value="previous">Previous month</option>
              <option value="last12">Last 12 months</option>
            </select>
          </div>
        </section>

        <section className="dashboard-hero" aria-label="Current household insight">
          <div className="hero-copy">
            <div className="dashboard-eyebrow">A clearer view of home</div>
            <h1>Your home,<br />in balance.</h1>
            <p>Understand how electricity, water, and natural gas shape your household costs and environmental footprint.</p>
            <a className="primary-button" href="#usage">View usage trend <span aria-hidden="true">→</span></a>
          </div>
          <div className="hero-insight">
            <Image className="hero-graphic" src="/greenmeter-home-graphic.png" alt="Illustrated sustainable home among rolling hills and trees" width={1756} height={896} priority />
            <span>Current insight</span>
            <h2>{summary.emissions.totalKg.toLocaleString()} kg CO₂e</h2>
            <p>Estimated household emissions for {summary.dateRangeLabel}.</p>
            <div className="insight-stats">
              <div><span>Recorded cost</span><strong>${summary.totalCost.toFixed(2)}</strong></div>
              <div><span>Reporting coverage</span><strong>{summary.reportingProgress.toFixed(0)}%</strong></div>
              <div><span>Compared with prior period</span><strong className={emissionsComparison.className}>{emissionsComparison.text}</strong></div>
            </div>
          </div>
        </section>

        <section className="summary-grid" aria-label="Utility summary">
          <article className="summary-card electricity-card">
            <div className="summary-label"><span className="utility-icon electricity"><UtilityIcon utility="Electricity" /></span>Electricity</div>
            <div className="summary-value">{summary.electricity.amount.toLocaleString()} <small>{summary.electricity.unit}</small></div>
            <div className="summary-meta"><span className={electricityComparison.className}>{electricityComparison.text}</span><span>{summary.electricity.changePercent === null ? "" : "than prior period"}</span></div>
          </article>
          <article className="summary-card water-card">
            <div className="summary-label"><span className="utility-icon water"><UtilityIcon utility="Water" /></span>Water</div>
            <div className="summary-value">{summary.water.amount.toLocaleString()} <small>{summary.water.unit}</small></div>
            <div className="summary-meta"><span className={waterComparison.className}>{waterComparison.text}</span><span>{summary.water.changePercent === null ? "" : "than prior period"}</span></div>
          </article>
          <article className="summary-card gas-card">
            <div className="summary-label"><span className="utility-icon gas"><UtilityIcon utility="Gas" /></span>Natural gas</div>
            <div className="summary-value">{summary.gas.amount.toLocaleString()} <small>{summary.gas.unit}</small></div>
            <div className="summary-meta"><span className={gasComparison.className}>{gasComparison.text}</span><span>{summary.gas.changePercent === null ? "" : "than prior period"}</span></div>
          </article>
        </section>

        <section className="content-grid" id="usage">
          <article className="card usage-card">
            <div className="card-header">
              <div><h2>Utility usage trend</h2><p>Recorded consumption for {summary.dateRangeLabel}</p></div>
              <div className="utility-chart-tabs" aria-label="Chart utility">
                {(["Electricity", "Water", "Gas"] as Utility[]).map((utility) => <button key={utility} type="button" className={`${utility.toLowerCase()} ${chartUtility === utility ? "active" : ""}`} onClick={() => setChartUtility(utility)}><UtilityIcon utility={utility} />{utility}</button>)}
              </div>
            </div>
            <div className="chart-summary">
              <div><span>Period total</span><strong>{chartTotal.amount.toLocaleString()} {chartTotal.unit}</strong></div>
              <div><span>Recorded-day average</span><strong>{chartAverage === null ? "—" : `${chartAverage} ${chartTotal.unit}`}</strong></div>
              <div><span>Highest recorded day</span><strong>{chartHighest === null ? "—" : `${chartHighest} ${chartTotal.unit}`}</strong></div>
            </div>
            <div className={`chart ${chartUtility.toLowerCase()}-chart`} aria-label={`${chartUtility} consumption for ${summary.dateRangeLabel}`}>
              <div className="axis-labels"><span>{chartMaximum}</span><span>{Math.round(chartMaximum * .67)}</span><span>{Math.round(chartMaximum * .33)}</span><span>0</span></div>
              <div className="chart-plot">
                {chartAverage !== null && <div className="average-line" style={{ bottom: `${(chartAverage / chartMaximum) * 100}%` }}><span>Average {chartAverage}</span></div>}
                {chartSeries.length === 0 && <div className="chart-empty">No {chartUtility.toLowerCase()} readings for this period</div>}
                {chartSeries.map((day) => (
                  <div className="chart-column" key={day.date}>
                    <div className="chart-bar" style={{ height: `${(day.amount / chartMaximum) * 100}%` }} title={`${day.label}: ${day.amount} ${chartTotal.unit}`} />
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
              <p><strong>{summary.emissions.electricityKg} kg</strong> from electricity, <strong>{summary.emissions.gasKg} kg</strong> from natural-gas combustion, and <strong>{summary.emissions.waterKg} kg</strong> from water supply and treatment.</p>
              <div className="factor-list">
                <a href={emissionsFactors.electricity.sourceUrl} target="_blank" rel="noreferrer"><span>Electricity</span><strong>{electricityFactorFor(householdSettings.egridSubregion).toFixed(3)} kg/kWh</strong><small>EPA eGRID {householdSettings.egridSubregion} · {egridRegions[householdSettings.egridSubregion].name} · 2023</small></a>
                <a href={emissionsFactors.naturalGas.sourceUrl} target="_blank" rel="noreferrer"><span>Natural gas</span><strong>{emissionsFactors.naturalGas.value.toFixed(3)} kg/therm</strong><small>{emissionsFactors.naturalGas.sourceName}</small></a>
                <a href={emissionsFactors.water.sourceUrl} target="_blank" rel="noreferrer"><span>Water supply</span><strong>{waterSources[householdSettings.waterSource].kwhPerKgal} kWh/kgal</strong><small>{waterSources[householdSettings.waterSource].name} · DOE generalized midpoint</small></a>
              </div>
              <p className="method-note">Estimates use EPA regional grid data and DOE generalized water-energy ranges. They are not utility-certified measurements.</p>
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
            <div><h2>Recent usage records</h2><p>Manual and imported utility readings</p></div>
            {session.authenticated ? (
              <div className="record-actions">
                <button className="secondary-button" onClick={() => { setShowImport((current) => !current); setShowForm(false); }}>{showImport ? "Close import" : "Import records"}</button>
                <button className="primary-button" onClick={() => { setShowForm((current) => !current); setShowImport(false); }}>{showForm ? "Cancel" : "Add record"}</button>
              </div>
            ) : <a className="primary-button" href={signInPath}>Sign in to add records</a>}
          </div>
          {showImport && (
            <section className="import-panel" aria-label="Import utility records">
              <div className="import-copy">
                <strong>Import utility history</strong>
                <p>Import GreenMeter&apos;s CSV template or a Green Button usage-data XML export from a participating utility.</p>
              </div>
              <div className="import-format-tabs" role="tablist" aria-label="Import format">
                <button type="button" role="tab" aria-selected={importFormat === "csv"} className={importFormat === "csv" ? "active" : ""} onClick={() => { setImportFormat("csv"); setImportPreview(null); setImportFileName(""); setImportContents(""); }}>CSV template</button>
                <button type="button" role="tab" aria-selected={importFormat === "green_button"} className={importFormat === "green_button" ? "active" : ""} onClick={() => { setImportFormat("green_button"); setImportPreview(null); setImportFileName(""); setImportContents(""); }}>Green Button XML</button>
              </div>
              {importFormat === "csv" ? (
                <p className="import-guidance">Use columns <code>date, utility, usage, cost</code>. Dates use YYYY-MM-DD. <a href="/greenmeter-import-template.csv" download>Download CSV template</a></p>
              ) : (
                <p className="import-guidance">Export “Download My Data” from your utility in Green Button XML format. GreenMeter converts supported interval readings into daily totals. The original file is not stored.</p>
              )}
              <label className="file-picker">
                <span>{importFileName || (importFormat === "csv" ? "Choose a CSV file" : "Choose a Green Button XML file")}</span>
                <input key={importFormat} type="file" accept={importFormat === "csv" ? ".csv,text/csv" : ".xml,application/xml,text/xml"} onChange={(event) => { const file = event.target.files?.[0]; if (file) void previewImport(file); }} />
              </label>
              {importing && <p className="import-status" role="status">Checking file…</p>}
              {importPreview && (
                <div className={`import-result ${importPreview.errors.length ? "has-errors" : ""}`}>
                  <strong>{importPreview.errors.length ? `${importPreview.errors.length} issues found` : `${importPreview.rows.length} records ready to import`}</strong>
                  <span>{importFormat === "green_button" && importPreview.totalIntervals !== undefined ? `${importPreview.totalIntervals} interval readings checked and grouped into ${importPreview.totalRows} daily records` : `${importPreview.totalRows} data rows checked`}</span>
                  {importPreview.warnings?.map((warning) => <p className="import-warning" key={warning}>{warning}</p>)}
                  {importPreview.errors.length > 0 && <ul>{importPreview.errors.slice(0, 8).map((error, index) => <li key={`${error.row ?? error.entry}-${index}`}>{error.row ? `Row ${error.row}` : `Entry ${error.entry ?? index + 1}`}: {error.message}</li>)}</ul>}
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
                    <td><span className={`table-utility-icon ${record.category.toLowerCase()}`}><UtilityIcon utility={record.category} /></span>{record.category}</td>
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
