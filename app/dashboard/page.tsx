"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Utility = "Electricity" | "Gas" | "Water";

type UsageRecord = {
  id: number;
  date: string;
  category: Utility;
  amount: number;
  unit: string;
  cost: number;
  source: "Manual" | "Demo data" | "Utility sync";
};

const usageByDay = [15.8, 18.2, 16.1, 21.4, 19.7, 24.1, 17.9, 16.8, 18.6, 17.3, 20.1, 16.4, 15.9, 18.1];
const dayLabels = ["Sep 8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21"];

export default function Home() {
  const [records, setRecords] = useState<UsageRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [savingRecord, setSavingRecord] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState("");
  const [period, setPeriod] = useState("Current billing cycle");

  const recordedCost = useMemo(
    () => records.reduce((sum, record) => sum + record.cost, 0),
    [records],
  );

  useEffect(() => {
    const controller = new AbortController();

    async function loadRecords() {
      try {
        const response = await fetch("/api/usage-records", { signal: controller.signal });
        const data = await response.json() as { records?: UsageRecord[]; error?: string };
        if (!response.ok || !data.records) throw new Error(data.error ?? "Usage records could not be loaded.");
        setRecords(data.records);
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
            <button className="account-button" aria-label="Open account menu">
              <span>AS</span><span className="account-name">Anusha</span><span aria-hidden="true">⌄</span>
            </button>
          </div>
        </div>
      </header>

      <main className="page" id="overview">
        <section className="page-heading">
          <div>
            <div className="breadcrumbs">Home <span>/</span> 1842 East Lemon Street</div>
            <h1>Energy overview</h1>
            <p>Usage, cost, and emissions estimates for this billing cycle.</p>
          </div>
          <div className="page-controls">
            <label htmlFor="period">Reporting period</label>
            <select id="period" value={period} onChange={(event) => setPeriod(event.target.value)}>
              <option>Current billing cycle</option>
              <option>Previous billing cycle</option>
              <option>Last 12 months</option>
            </select>
          </div>
        </section>

        <section className="billing-strip" aria-label="Billing cycle status">
          <div>
            <span className="status-dot" />
            <div><strong>Current billing cycle</strong><span>September 1–30 · 9 days remaining</span></div>
          </div>
          <div className="billing-progress" aria-label="70 percent of billing cycle complete"><span /></div>
          <div className="bill-estimate"><span>Projected bill</span><strong>${(62.4 + recordedCost).toFixed(2)}</strong></div>
        </section>

        <section className="impact-note" aria-label="Current sustainability insight">
          <div className="impact-number">11<span>kg</span></div>
          <div><strong>Emissions are trending lower</strong><p>Your current estimate is 11 kg CO₂e below the previous billing cycle.</p></div>
          <a href="#recommendations">View details <span aria-hidden="true">→</span></a>
        </section>

        <section className="summary-grid" aria-label="Utility summary">
          <article className="summary-card">
            <div className="summary-label"><span className="utility-mark electricity" />Electricity</div>
            <div className="summary-value">412 <small>kWh</small></div>
            <div className="summary-meta"><span className="positive">8.2% lower</span><span>than last cycle</span></div>
          </article>
          <article className="summary-card">
            <div className="summary-label"><span className="utility-mark water" />Water</div>
            <div className="summary-value">2,840 <small>gal</small></div>
            <div className="summary-meta"><span className="positive">5.1% lower</span><span>than last cycle</span></div>
          </article>
          <article className="summary-card">
            <div className="summary-label"><span className="utility-mark gas" />Natural gas</div>
            <div className="summary-value">18.3 <small>therms</small></div>
            <div className="summary-meta"><span className="negative">2.4% higher</span><span>than last cycle</span></div>
          </article>
          <article className="summary-card">
            <div className="summary-label">Estimated emissions</div>
            <div className="summary-value">146 <small>kg CO₂e</small></div>
            <div className="summary-meta"><span className="positive">11 kg lower</span><span>than last cycle</span></div>
          </article>
        </section>

        <section className="content-grid" id="usage">
          <article className="card usage-card">
            <div className="card-header">
              <div><h2>Electricity usage</h2><p>Daily consumption for the current billing cycle</p></div>
              <div className="legend"><span /><span>Daily usage</span><i />30-day average</div>
            </div>
            <div className="chart-summary">
              <div><span>Cycle total</span><strong>412 kWh</strong></div>
              <div><span>Daily average</span><strong>18.7 kWh</strong></div>
              <div><span>Highest day</span><strong>24.1 kWh</strong></div>
            </div>
            <div className="chart" aria-label="Electricity consumption for September 8 through September 21">
              <div className="axis-labels"><span>30</span><span>20</span><span>10</span><span>0</span></div>
              <div className="chart-plot">
                <div className="average-line"><span>Average 18.7</span></div>
                {usageByDay.map((value, index) => (
                  <div className="chart-column" key={`${dayLabels[index]}-${value}`}>
                    <div className="chart-bar" style={{ height: `${(value / 30) * 100}%` }} title={`${dayLabels[index]}: ${value} kWh`} />
                    <small>{dayLabels[index]}</small>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <aside className="side-stack">
            <article className="card goal-card">
              <div className="card-header compact"><div><h2>Monthly target</h2><p>10% electricity reduction</p></div><span className="status-badge">On track</span></div>
              <div className="target-row"><strong>7.4%</strong><span>reduction achieved</span></div>
              <div className="progress-track"><span /></div>
              <div className="target-scale"><span>0%</span><span>Target: 10%</span></div>
            </article>
            <article className="card emissions-card">
              <h2>How emissions are estimated</h2>
              <p>We multiply your recorded utility usage by standard emissions factors. This is an estimate, not a utility measurement.</p>
              <button className="link-button">View calculation details</button>
            </article>
          </aside>
        </section>

        <section className="card recommendations" id="recommendations">
          <div className="card-header"><div><h2>Usage alerts and recommendations</h2><p>Based on patterns in the current billing cycle</p></div></div>
          <div className="recommendation-list">
            <div className="recommendation-row">
              <span className="recommendation-type alert">Alert</span>
              <div><strong>Evening electricity usage increased</strong><p>Usage between 6 PM and 9 PM is 11% higher than your previous billing cycle.</p></div>
              <button className="secondary-button">Review usage</button>
            </div>
            <div className="recommendation-row">
              <span className="recommendation-type">Tip</span>
              <div><strong>Move dishwasher runs outside peak hours</strong><p>Running after 8 PM may reduce time-of-use charges on eligible plans.</p></div>
              <button className="secondary-button">Learn more</button>
            </div>
          </div>
        </section>

        <section className="card records-card" id="records">
          <div className="card-header">
            <div><h2>Recent usage records</h2><p>Demonstration and manually entered utility readings</p></div>
            <button className="primary-button" onClick={() => setShowForm((current) => !current)}>{showForm ? "Cancel" : "Add record"}</button>
          </div>
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
