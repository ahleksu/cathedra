"use client";
import { useState } from "react";
import { ArrowRightIcon, LockSimpleIcon } from "@phosphor-icons/react";

export default function Onboarding({
  onComplete,
  busy,
  onRestore,
}: {
  onComplete: (names: string[]) => void;
  busy: boolean;
  onRestore?: () => void;
}) {
  const [count, setCount] = useState("4");
  const [names, setNames] = useState<string[] | null>(null);
  const [error, setError] = useState("");
  return (
    <main className="onboarding">
      <div className="setup-story">
        <div className="wordmark">
          Cathedra
          <span className="brand-square" />
        </div>
        <div>
          <h1>
            A place for
            <br />
            every name.
          </h1>
          <p>
            Your classroom, a little more familiar. Connect names to seats in
            your own view of the room.
          </p>
        </div>
        <div className="setup-floor" aria-hidden="true">
          {Array.from({ length: 6 }, (_, row) => (
            <div className="setup-row" key={row}>
              {Array.from({ length: 7 }, (_, col) => (
                <span key={col} className={col === 3 ? "aisle-seat" : ""} />
              ))}
            </div>
          ))}
        </div>
        <p className="privacy-note">
          <LockSimpleIcon size={18} /> Student records stay in this browser.
        </p>
      </div>
      <section className="setup-form">
        <div className="step-indicator">
          {names ? "2" : "1"} of 2{" "}
          <span>{names ? "Your sections" : "Your classroom"}</span>
        </div>
        <h2>{names ? "Name your sections." : "Make room for your classes."}</h2>
        <p className="muted">
          {names
            ? "Use the names you recognize in class. You can change them later."
            : "Each section gets its own roster and seating map. How many do you teach?"}
        </p>
        {!names ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(count);
              if (!Number.isSafeInteger(n) || n < 1 || n > 100) {
                setError(
                  "Enter a whole number from 1 to 100. You can add more sections later.",
                );
                return;
              }
              setNames(Array.from({ length: n }, () => ""));
              setError("");
            }}
          >
            <label>
              Number of sections
              <input
                type="number"
                min="1"
                max="100"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                required
                autoFocus
              />
            </label>
            <p className="field-help">
              Start with your current sections. Add more whenever you need.
            </p>
            <button className="primary" type="submit">
              Continue <ArrowRightIcon size={18} />
            </button>
          </form>
        ) : (
          <form
            aria-label="Name your sections"
            onSubmit={(e) => {
              e.preventDefault();
              if (names.some((n) => !n.trim())) {
                setError("Give every section a name.");
                return;
              }
              onComplete(names.map((n) => n.trim()));
            }}
          >
            <div className="section-fields">
              {names.map((name, index) => (
                <label key={index}>
                  Section {index + 1}
                  <input
                    required
                    maxLength={100}
                    value={name}
                    placeholder={`e.g. ${["DCSAD", "CCSAD", "ACSAD", "BCSAD"][index % 4]}`}
                    onChange={(e) =>
                      setNames(
                        names.map((n, i) => (i === index ? e.target.value : n)),
                      )
                    }
                  />
                </label>
              ))}
            </div>
            <p className="field-help">
              Your rosters start empty. Add student names and numbers inside
              each section.
            </p>
            <div className="actions">
              <button
                type="button"
                onClick={() => setNames(null)}
                disabled={busy}
              >
                Back
              </button>
              <button className="primary" disabled={busy} type="submit">
                {busy ? "Saving…" : "Open my classroom"}
                <ArrowRightIcon size={18} />
              </button>
            </div>
          </form>
        )}
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
        {onRestore && (
          <button className="text-button" onClick={onRestore}>
            Restore an existing backup
          </button>
        )}
        <div className="setup-footnote">
          <strong>One room. Separate rosters.</strong>
          <p>
            42 seats in the B2-110 laboratory. Your browser saves your changes.
            Download a backup to move your records to another device.
          </p>
        </div>
      </section>
    </main>
  );
}
