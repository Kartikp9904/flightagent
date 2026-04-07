"use client";

import { useState } from "react";
import {
  Search, Plane, Calendar, Users, Briefcase,
  Mail, AlertCircle, Sparkles, MapPin, Clock,
  ArrowRight, Luggage, ExternalLink, ChevronDown, ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Flight, SearchCriteria } from "@/lib/agent";

/* ─── helpers ─────────────────────────────────────────────────── */

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch { return iso; }
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" });
  } catch { return ""; }
}

function stopsLabel(stops: number, locs: string[]) {
  if (stops === 0) return "Non-stop";
  const via = locs.filter(Boolean).join(", ");
  return via ? `${stops} stop · via ${via}` : `${stops} stop${stops > 1 ? "s" : ""}`;
}

/* ─── FlightCard ──────────────────────────────────────────────── */

function FlightCard({ flight, criteria, idx, onNotify }: {
  flight: Flight;
  criteria: SearchCriteria;
  idx: number;
  onNotify: (f: Flight, type: "email" | "whatsapp") => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [email, setEmail] = useState("");

  const depDate = fmtDate(flight.departureTime);
  const arrDate = fmtDate(flight.arrivalTime);
  const overnight = depDate !== arrDate && arrDate !== "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.07, ease: "easeOut" }}
      style={{
        background: "rgba(15,23,42,0.7)",
        border: "1px solid rgba(99,102,241,0.18)",
        borderRadius: "1.25rem",
        backdropFilter: "blur(12px)",
        overflow: "hidden",
        marginBottom: "1.25rem",
        boxShadow: "0 4px 32px rgba(0,0,0,0.35)",
        position: "relative",
      }}
    >
      {/* badge strip */}
      {(flight.isCheapest || flight.isBestValue) && (
        <div style={{
          display: "flex", gap: "0.5rem",
          position: "absolute", top: "1rem", right: "1rem", zIndex: 2,
        }}>
          {flight.isCheapest && (
            <span style={{
              background: "linear-gradient(135deg,#10b981,#059669)",
              color: "#fff", fontSize: "0.7rem", fontWeight: 700,
              padding: "0.2rem 0.65rem", borderRadius: "999px", letterSpacing: "0.05em",
            }}>CHEAPEST</span>
          )}
          {flight.isBestValue && (
            <span style={{
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              color: "#fff", fontSize: "0.7rem", fontWeight: 700,
              padding: "0.2rem 0.65rem", borderRadius: "999px", letterSpacing: "0.05em",
            }}>BEST VALUE</span>
          )}
        </div>
      )}

      {/* ── main row ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr auto",
        alignItems: "center",
        gap: "0.75rem",
        padding: "1.5rem 1.75rem",
      }}>

        {/* LEFT — airline + number */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{
              width: 36, height: 36, borderRadius: "10px",
              background: "rgba(99,102,241,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <Plane size={18} color="#818cf8" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#e2e8f0" }}>
                {flight.airline}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", fontFamily: "monospace" }}>
                {flight.flightNumber}
              </div>
            </div>
          </div>
        </div>

        {/* CENTRE — route timeline */}
        <div style={{
          display: "flex", alignItems: "center", gap: "1.25rem",
          padding: "0 1rem",
        }}>
          {/* departure */}
          <div style={{ textAlign: "center", minWidth: 64 }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f1f5f9", lineHeight: 1 }}>
              {fmtTime(flight.departureTime)}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.2rem" }}>
              {criteria.origin}
            </div>
            <div style={{ fontSize: "0.65rem", color: "#475569" }}>{depDate}</div>
          </div>

          {/* line + duration */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 120 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.3rem", color: "#94a3b8" }}>
              <Clock size={11} />
              <span style={{ fontSize: "0.72rem" }}>{flight.duration}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
              <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg,#334155,#6366f1)" }} />
              <ArrowRight size={13} color="#6366f1" style={{ flexShrink: 0 }} />
            </div>
            <div style={{ fontSize: "0.68rem", color: flight.stops === 0 ? "#10b981" : "#f59e0b", marginTop: "0.3rem" }}>
              {stopsLabel(flight.stops, flight.stopLocations)}
            </div>
          </div>

          {/* arrival */}
          <div style={{ textAlign: "center", minWidth: 64 }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f1f5f9", lineHeight: 1 }}>
              {fmtTime(flight.arrivalTime)}
              {overnight && <sup style={{ fontSize: "0.55rem", color: "#f59e0b", marginLeft: 2 }}>+1</sup>}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.2rem" }}>
              {criteria.destination}
            </div>
            <div style={{ fontSize: "0.65rem", color: "#475569" }}>{arrDate}</div>
          </div>
        </div>

        {/* RIGHT — price + book */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.75rem" }}>
          <div>
            <div style={{ fontSize: "1.75rem", fontWeight: 900, color: "#f1f5f9", lineHeight: 1 }}>
              {flight.currency === "USD" ? "$" : flight.currency + " "}
              {flight.price.toLocaleString()}
            </div>
            <div style={{ fontSize: "0.7rem", color: "#475569", textAlign: "right" }}>
              per person · {criteria.cabinClass}
            </div>
          </div>

          {/*
            Book Now — href is always built by buildBookingLink in flights.ts/agent.ts.
            It is NEVER "#" or a raw API redirect. It opens a real pre-filled search
            on the airline's own site (or Google Flights as universal fallback).
          */}
          <a
            href={flight.bookingLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.4rem",
              background: "linear-gradient(135deg,#fbbf24 0%,#d97706 100%)",
              color: "#000", fontWeight: 800, fontSize: "0.85rem",
              padding: "0.6rem 1.4rem", borderRadius: "0.75rem",
              textDecoration: "none",
              boxShadow: "0 0 20px rgba(251,191,36,0.3)",
              whiteSpace: "nowrap",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 4px 24px rgba(251,191,36,0.5)";
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 20px rgba(251,191,36,0.3)";
            }}
          >
            Book Now <ExternalLink size={13} />
          </a>

          {/* expand toggle */}
          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "#64748b", fontSize: "0.72rem",
              display: "flex", alignItems: "center", gap: "0.25rem",
              padding: 0,
            }}
          >
            {expanded ? <><ChevronUp size={13} /> Less</> : <><ChevronDown size={13} /> More details</>}
          </button>
        </div>
      </div>

      {/* ── expanded panel ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: "hidden" }}
          >
            <div style={{
              borderTop: "1px solid rgba(99,102,241,0.15)",
              padding: "1.25rem 1.75rem",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1.5rem",
            }}>
              {/* left: agent reasoning + baggage */}
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {flight.agentReasoning && (
                  <div style={{
                    background: "rgba(99,102,241,0.08)",
                    border: "1px solid rgba(99,102,241,0.2)",
                    borderRadius: "0.75rem",
                    padding: "0.9rem 1rem",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.4rem" }}>
                      <Sparkles size={13} color="#6366f1" />
                      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#6366f1", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                        Agent Analysis
                      </span>
                    </div>
                    <p style={{ fontSize: "0.82rem", color: "#94a3b8", lineHeight: 1.6, margin: 0 }}>
                      {flight.agentReasoning}
                    </p>
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#64748b", fontSize: "0.8rem" }}>
                  <Luggage size={14} />
                  <span>{flight.baggageInfo}</span>
                </div>
              </div>

              {/* right: notify me */}
              <div>
                <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "0.75rem" }}>
                  Price Alert
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    placeholder="your@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{
                      flex: 1, background: "rgba(15,23,42,0.8)",
                      border: "1px solid rgba(99,102,241,0.25)",
                      borderRadius: "0.6rem", padding: "0.55rem 0.8rem",
                      color: "#e2e8f0", fontSize: "0.82rem", outline: "none",
                    }}
                  />
                  <button
                    onClick={() => onNotify(flight, "email")}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.35rem",
                      background: "rgba(99,102,241,0.15)",
                      border: "1px solid rgba(99,102,241,0.3)",
                      borderRadius: "0.6rem", padding: "0.55rem 0.9rem",
                      color: "#818cf8", fontSize: "0.82rem", cursor: "pointer",
                      fontWeight: 600, whiteSpace: "nowrap",
                    }}
                  >
                    <Mail size={13} /> Notify Me
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Page ────────────────────────────────────────────────────── */

export default function Home() {
  const [criteria, setCriteria] = useState<SearchCriteria>({
    origin: "",
    destination: "",
    departureDate: "",
    passengers: 1,
    cabinClass: "Economy",
  });

  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [results, setResults] = useState<{ flights: Flight[]; agentInsight: string } | null>(null);
  const [errorModal, setErrorModal] = useState<{ show: boolean; title: string; message: string; tip: string }>({
    show: false, title: "", message: "", tip: "",
  });
  const [notificationStatus, setNotificationStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResults(null);
    setLogs([]);
    setErrorModal({ ...errorModal, show: false });

    try {
      const response = await fetch("/api/flights/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(criteria),
      });

      if (!response.body) throw new Error("No response body from live search.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          let parsedData: unknown = null;
          try { parsedData = JSON.parse(line.replace("data: ", "")); }
          catch { continue; }

          if (typeof parsedData === "object" && parsedData !== null) {
            const data = parsedData as { type: string; message?: string };
            if (data.type === "log") setLogs(prev => [...prev, data.message || ""]);
            else if (data.type === "result") setResults(parsedData as { flights: Flight[]; agentInsight: string });
            else if (data.type === "error") throw new Error(data.message || "Unknown error during search.");
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      let errorData = {
        show: true,
        title: "Search Encountered an Issue",
        message: "The live search failed to complete properly.",
        tip: "Please try refreshing the page or check your connection.",
      };

      if (msg.includes("CAUSE: QUOTA")) {
        errorData = { show: true, title: "Gemini 2.5 Engine at Capacity", message: "The Gemini 2.5 API has reached its processing limit.", tip: "Wait ~60 seconds or try a different API key." };
      } else if (msg.includes("CAUSE: MODEL")) {
        errorData = { show: true, title: "Gemini 2.5 Model Unavailable", message: "The 'gemini-2.5-flash' engine is not available for this API key.", tip: "Open lib/agent.ts and switch to 'gemini-1.5-flash'." };
      } else if (msg.includes("CAUSE: NO_RESULTS")) {
        errorData = { show: true, title: "No Flights Found", message: "No flights matched your criteria.", tip: "Try different dates or more popular airports." };
      } else if (msg.includes("CAUSE: NETWORK")) {
        errorData = { show: true, title: "Network Error", message: "Could not connect to the search provider.", tip: "Check your internet connection and try again." };
      } else if (msg.includes("CAUSE: TIMEOUT")) {
        errorData = { show: true, title: "Agent Connection Timeout", message: "The search agent timed out.", tip: "Try again in a few minutes." };
      } else {
        errorData.message = msg;
      }

      setErrorModal(errorData);
    } finally {
      setLoading(false);
    }
  };

  const handleNotify = async (flight: Flight, type: "email" | "whatsapp") => {
    try {
      const res = await fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, flight }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setNotificationStatus({ success: true, message: `Notification sent via ${type}!` });
      setTimeout(() => setNotificationStatus(null), 5000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send notification.";
      setNotificationStatus({ success: false, message: errorMessage });
    }
  };

  return (
    <main className="container">
      <header className="hero">
        <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          Intelligent Flight Agent
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          Autonomous agents scouting the globe for your perfect flight.
          Compare price, value, and comfort in seconds.
        </motion.p>
      </header>

      {/* Search Form */}
      <section className="glass-card fade-in">
        <form onSubmit={handleSearch} className="search-form">
          <div className="form-group">
            <label><MapPin size={14} style={{ marginRight: 4 }} /> From (Airport/City)</label>
            <input className="form-input" placeholder="e.g. London (LHR)" required
              value={criteria.origin} onChange={e => setCriteria({ ...criteria, origin: e.target.value })} />
          </div>
          <div className="form-group">
            <label><MapPin size={14} style={{ marginRight: 4 }} /> To (Airport/City)</label>
            <input className="form-input" placeholder="e.g. Tokyo (NRT)" required
              value={criteria.destination} onChange={e => setCriteria({ ...criteria, destination: e.target.value })} />
          </div>
          <div className="form-group">
            <label><Calendar size={14} style={{ marginRight: 4 }} /> Departure</label>
            <input type="date" className="form-input" required
              value={criteria.departureDate} onChange={e => setCriteria({ ...criteria, departureDate: e.target.value })} />
          </div>
          <div className="form-group">
            <label><Users size={14} style={{ marginRight: 4 }} /> Passengers</label>
            <input type="number" min="1" className="form-input"
              value={criteria.passengers} onChange={e => setCriteria({ ...criteria, passengers: parseInt(e.target.value) })} />
          </div>
          <div className="form-group">
            <label><Briefcase size={14} style={{ marginRight: 4 }} /> Class</label>
            <select className="form-input" value={criteria.cabinClass}
              onChange={e => setCriteria({ ...criteria, cabinClass: e.target.value })}>
              <option>Economy</option>
              <option>Business</option>
              <option>First</option>
            </select>
          </div>
          <div className="form-group" style={{ justifyContent: "flex-end" }}>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? "Searching..." : <><Search size={18} /> Search Flights</>}
            </button>
          </div>
        </form>
      </section>

      {/* Live log */}
      <AnimatePresence>
        {loading && logs.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="glass-card"
            style={{ marginTop: "1.5rem", padding: "1.5rem", borderLeft: "4px solid var(--primary)" }}
          >
            <h4 style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", color: "var(--primary)" }}>
              <div className="pulse-dot" /> Live Agent Process Log
            </h4>
            <div className="log-container">
              {logs.map((log, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                  style={{ fontSize: "0.875rem", marginBottom: "0.5rem", color: i === logs.length - 1 ? "#fff" : "#94a3b8" }}>
                  <span style={{ marginRight: "0.5rem", opacity: 0.5 }}>
                    [{new Date().toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}]
                  </span>
                  {log}
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Error modal */}
      <AnimatePresence>
        {errorModal.show && (
          <div className="modal-overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="error-modal"
            >
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                <div style={{ padding: "0.75rem", borderRadius: "12px", background: "rgba(239,68,68,0.2)", color: "#ef4444" }}>
                  <AlertCircle size={24} />
                </div>
                <h3 style={{ fontSize: "1.5rem", fontWeight: 700 }}>{errorModal.title}</h3>
              </div>
              <p style={{ color: "#cbd5e1", lineHeight: 1.6, marginBottom: "1.5rem" }}>{errorModal.message}</p>
              <div className="error-tip">
                <strong style={{ display: "block", marginBottom: "0.25rem", color: "#ef4444" }}>Pro Tip:</strong>
                {errorModal.tip}
              </div>
              <button className="btn" style={{ marginTop: "2rem", width: "100%" }}
                onClick={() => setErrorModal({ ...errorModal, show: false })}>
                Got it, let me try again
              </button>
            </motion.div>
          </div>
        )}

        {notificationStatus && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="glass-card"
            style={{
              position: "fixed", bottom: "2rem", right: "2rem", zIndex: 100,
              background: notificationStatus.success ? "#065f46" : "#991b1b",
            }}
          >
            {notificationStatus.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {results && (
        <section style={{ marginTop: "3rem" }}>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="agent-insight-banner">
            <Sparkles className="sparkle-icon" color="#6366f1" />
            <div>
              <h4>Agent Insights</h4>
              <p>{results.agentInsight}</p>
            </div>
          </motion.div>

          <div style={{ marginTop: "1.5rem" }}>
            {results.flights.map((flight, idx) => (
              <FlightCard
                key={flight.id}
                flight={flight}
                criteria={criteria}
                idx={idx}
                onNotify={handleNotify}
              />
            ))}
          </div>
        </section>
      )}

      {/* Loading spinner */}
      {loading && (
        <div style={{ textAlign: "center", padding: "6rem" }}>
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            style={{ display: "inline-block", marginBottom: "1rem" }}>
            <Sparkles size={48} color="#6366f1" />
          </motion.div>
          <p>The Flight Agent is scanning multiple sources...</p>
        </div>
      )}
    </main>
  );
}