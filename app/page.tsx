"use client";

import { useState } from "react";
import { Search, Plane, Calendar, Users, Briefcase, Mail, AlertCircle, Sparkles, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Flight, SearchCriteria } from "@/lib/agent";

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
  const [results, setResults] = useState<{ flights: Flight[], agentInsight: string } | null>(null);
  const [errorModal, setErrorModal] = useState<{ show: boolean, title: string, message: string, tip: string }>({
    show: false,
    title: "",
    message: "",
    tip: ""
  });
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notificationStatus, setNotificationStatus] = useState<{ success?: boolean, message?: string } | null>(null);

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
          try {
            parsedData = JSON.parse(line.replace("data: ", ""));
          } catch (err) {
            console.error("Error parsing stream line:", err);
            continue;
          }
          
          if (typeof parsedData === "object" && parsedData !== null) {
            const data = parsedData as { type: string, message?: string };
            if (data.type === "log") {
              setLogs(prev => [...prev, data.message || ""]);
            } else if (data.type === "result") {
              setResults(parsedData as { flights: Flight[], agentInsight: string });
            } else if (data.type === "error") {
              // Re-throw outside that can be caught by the main catch block
              throw new Error(data.message || "An unknown error occurred during the search.");
            }
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      let errorData = { 
        show: true, 
        title: "Search Encoutered an Issue", 
        message: "The live search failed to complete properly.", 
        tip: "Please try refreshing the page or check your connection."
      };

      if (msg.includes("CAUSE: QUOTA")) {
        errorData = {
          show: true,
          title: "Gemini 2.5 Engine at Capacity",
          message: "The high-performance Gemini 2.5 API has reached its current processing limit.",
          tip: "Wait for about 60 seconds or try a different API key if your per-day limit is over."
        };
      } else if (msg.includes("CAUSE: MODEL")) {
        errorData = {
          show: true,
          title: "Gemini 2.5 Model unavailable",
          message: "The requested 'gemini-2.5-flash' engine is not available in your current region or for this API key.",
          tip: "Open 'lib/agent.ts' and try switching to 'gemini-1.5-flash' for maximum compatibility."
        };
      } else if (msg.includes("CAUSE: NO_RESULTS")) {
        errorData = {
          show: true,
          title: "No Flights Discovered",
          message: "Our agents scanned the search engine but found no flights matching your specific criteria.",
          tip: "Try broadening your date range or choosing more popular airports (like LHR or JFK)."
        };
      } else if (msg.includes("CAUSE: TIMEOUT")) {
        errorData = {
          show: true,
          title: "Agent Connection Timeout",
          message: "The scraping agent timed out while waiting for the live page to load.",
          tip: "Google Flights might be blocking heavy traffic. Try again in a few minutes."
        };
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
        body: JSON.stringify({
          type,
          email: type === "email" ? notifyEmail : undefined,
          flight,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setNotificationStatus({ success: true, message: `Notification sent successfully via ${type}!` });
      setTimeout(() => setNotificationStatus(null), 5000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send notification.";
      setNotificationStatus({ success: false, message: errorMessage });
    }
  };

  return (
    <main className="container">
      <header className="hero">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Intelligent Flight Agent
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          Autonomous agents scouting the globe for your perfect flight.
          Compare price, value, and comfort in seconds.
        </motion.p>
      </header>

      {/* Search Form */}
      <section className="glass-card fade-in">
        <form onSubmit={handleSearch} className="search-form">
          <div className="form-group">
            <label><MapPin size={14} style={{marginRight: 4}} /> From (Airport/City)</label>
            <input 
              className="form-input" 
              placeholder="e.g. London (LHR)" 
              required
              value={criteria.origin}
              onChange={e => setCriteria({...criteria, origin: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label><MapPin size={14} style={{marginRight: 4}} /> To (Airport/City)</label>
            <input 
              className="form-input" 
              placeholder="e.g. Tokyo (NRT)" 
              required
              value={criteria.destination}
              onChange={e => setCriteria({...criteria, destination: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label><Calendar size={14} style={{marginRight: 4}} /> Departure</label>
            <input 
              type="date" 
              className="form-input" 
              required 
              value={criteria.departureDate}
              onChange={e => setCriteria({...criteria, departureDate: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label><Users size={14} style={{marginRight: 4}} /> Passengers</label>
            <input 
              type="number" 
              min="1" 
              className="form-input" 
              value={criteria.passengers}
              onChange={e => setCriteria({...criteria, passengers: parseInt(e.target.value)})}
            />
          </div>
          <div className="form-group">
            <label><Briefcase size={14} style={{marginRight: 4}} /> Class</label>
            <select 
              className="form-input"
              value={criteria.cabinClass}
              onChange={e => setCriteria({...criteria, cabinClass: e.target.value})}
            >
              <option>Economy</option>
              <option>Business</option>
              <option>First</option>
            </select>
          </div>
          <div className="form-group" style={{ justifyContent: 'flex-end' }}>
            <button type="submit" className="btn" disabled={loading}>
              {loading ? "Searching..." : <><Search size={18} /> Search Flights</>}
            </button>
          </div>
        </form>
      </section>

      {/* Search Progress Log */}
      <AnimatePresence>
        {loading && logs.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="glass-card" 
            style={{ marginTop: '1.5rem', padding: '1.5rem', borderLeft: '4px solid var(--primary)' }}
          >
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--primary)' }}>
              <div className="pulse-dot"></div>
              Live Agent Process Log
            </h4>
            <div className="log-container">
              {logs.map((log, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, x: -5 }} 
                  animate={{ opacity: 1, x: 0 }}
                  style={{ fontSize: '0.875rem', marginBottom: '0.5rem', color: i === logs.length - 1 ? '#fff' : '#94a3b8' }}
                >
                  <span style={{ marginRight: '0.5rem', opacity: 0.5 }}>[{new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                  {log}
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Status Messages & Error Modal */}
      <AnimatePresence>
        {errorModal.show && (
          <div className="modal-overlay">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="error-modal"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                  <AlertCircle size={24} />
                </div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{errorModal.title}</h3>
              </div>
              
              <p style={{ color: '#cbd5e1', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                {errorModal.message}
              </p>

              <div className="error-tip">
                <strong style={{ display: 'block', marginBottom: '0.25rem', color: '#ef4444' }}>Pro Tip:</strong>
                {errorModal.tip}
              </div>

              <button 
                className="btn" 
                style={{ marginTop: '2rem', width: '100%' }}
                onClick={() => setErrorModal({ ...errorModal, show: false })}
              >
                Got it, let me try again
              </button>
            </motion.div>
          </div>
        )}
        {notificationStatus && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="glass-card" 
            style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 100, background: notificationStatus.success ? '#065f46' : '#991b1b' }}
          >
            {notificationStatus.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      {results && (
        <section style={{ marginTop: '3rem' }}>
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="agent-insight-banner"
          >
            <Sparkles className="sparkle-icon" color="#6366f1" />
            <div>
              <h4>Agent Insights</h4>
              <p>{results.agentInsight}</p>
            </div>
          </motion.div>

          <div className="results-grid">
            {results.flights.map((flight, idx) => (
              <motion.div 
                key={flight.id} 
                className="glass-card flight-card"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <div className="flight-header">
                  <div className="airline-info">
                    <Plane size={24} color="#6366f1" />
                    <div>
                      <h3>{flight.airline}</h3>
                      <p style={{fontSize: '0.8rem', color: '#64748b'}}>{flight.flightNumber}</p>
                    </div>
                  </div>
                  <div>
                    {flight.isCheapest && <span className="badge badge-cheapest">Cheapest</span>}
                    {flight.isBestValue && <span className="badge badge-best" style={{marginLeft: 8}}>Best Value</span>}
                  </div>
                  <div className="price-tag">
                    {flight.price} {flight.currency}
                  </div>
                </div>

                <div className="flight-details">
                  <div className="time-box">
                    <h3>{new Date(flight.departureTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</h3>
                    <p>{criteria.origin}</p>
                  </div>
                  <div className="duration-line">
                    <p style={{fontSize: '0.75rem', marginBottom: '0.25rem'}}>{flight.duration}</p>
                    <div className="line"></div>
                    <p style={{fontSize: '0.75rem', marginTop: '0.25rem'}}>
                      {flight.stops === 0 ? "Non-stop" : `${flight.stops} stop via ${flight.stopLocations.join(", ")}`}
                    </p>
                  </div>
                  <div className="time-box" style={{ textAlign: 'right' }}>
                    <h3>{new Date(flight.arrivalTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</h3>
                    <p>{criteria.destination}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem', gap: '2rem', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.875rem', color: '#cbd5e1', fontStyle: 'italic' }}>
                      &quot; {flight.agentReasoning} &quot;
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div className="form-group" style={{ minWidth: '200px' }}>
                      <input 
                        className="form-input" 
                        placeholder="your@email.com" 
                        style={{ padding: '0.5rem' }}
                        value={notifyEmail}
                        onChange={e => setNotifyEmail(e.target.value)}
                      />
                    </div>
                    <button className="btn" style={{ padding: '0.5rem 1rem' }} onClick={() => handleNotify(flight, "email")}>
                      <Mail size={16} /> Notify Me
                    </button>
                    <a 
                      href={flight.bookingLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn" 
                      style={{ padding: '0.5rem 1.5rem', background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)', color: '#000', textDecoration: 'none' }}
                    >
                      <Sparkles size={16} /> Book Now
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '6rem' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
            style={{ display: 'inline-block', marginBottom: '1rem' }}
          >
            <Sparkles size={48} color="#6366f1" />
          </motion.div>
          <p>The Flight Agent is scanning multiple sources...</p>
        </div>
      )}
    </main>
  );
}
