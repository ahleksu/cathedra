"use client";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import {
  ArchiveIcon,
  ArrowCounterClockwiseIcon,
  ArrowsOutIcon,
  CaretRightIcon,
  DownloadSimpleIcon,
  GearSixIcon,
  GraduationCapIcon,
  ListIcon,
  LockSimpleIcon,
  MagnifyingGlassIcon,
  MapTrifoldIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
  UploadSimpleIcon,
  UsersIcon,
  XIcon,
} from "@phosphor-icons/react";
import {
  EMPTY_SNAPSHOT,
  mutate,
  parseSnapshot,
  type Action,
  type Section,
  type Snapshot,
  type Student,
} from "../lib/model";
import { downloadText, useStore } from "../lib/use-store";
import Onboarding from "./onboarding";
import Dialog from "./dialog";
const RoomScene = dynamic(() => import("./room-scene"), {
  ssr: false,
  loading: () => <div className="scene-loading">Preparing the room…</div>,
});
type CameraCommand = {
  preset: "reset" | "instructor" | "top" | "focus";
  seatId?: string;
  sequence: number;
};
type FormState =
  | { kind: "student"; student?: Student }
  | { kind: "section"; section?: Section }
  | null;
type Confirmation = {
  title: string;
  body: string;
  label: string;
  run: () => Promise<unknown>;
};
class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
function typing(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(
      target.closest('input,textarea,select,[contenteditable="true"],dialog'),
    )
  );
}

export default function Classroom() {
  const store = useStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showNames, setShowNames] = useState(false);
  const [flat, setFlat] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);
  const [space, setSpace] = useState(false);
  const [touchNavigation, setTouchNavigation] = useState(false);
  const [camera, setCamera] = useState<CameraCommand>({
    preset: "reset",
    sequence: 0,
  });
  const [drawer, setDrawer] = useState(false);
  const [form, setForm] = useState<FormState>(null);
  const [settings, setSettings] = useState(false);
  const [archive, setArchive] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [imported, setImported] = useState<Snapshot | null>(null);
  const [notice, setNotice] = useState("");
  const [candidate, setCandidate] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const sections = store.snapshot.sections.filter((s) => !s.archived);
  const section = sections.find((s) => s.id === activeId) ?? sections[0];
  const students = section?.students.filter((s) => !s.archived) ?? [];
  const selectedStudent = students.find(
    (s) =>
      s.id ===
      (studentId ?? (selectedSeat ? section?.assignments[selectedSeat] : null)),
  );
  const assigned = Object.keys(section?.assignments ?? {}).length;
  const blocked = store.busy || Boolean(store.error);
  const overlayOpen = Boolean(
    form || settings || archive || confirmation || imported,
  );
  const occupants = Object.fromEntries(
    Object.entries(section?.assignments ?? {}).map(([seat, id]) => [
      seat,
      students.find((s) => s.id === id)?.name ?? "",
    ]),
  );
  function preset(value: CameraCommand["preset"], seatId?: string) {
    setCamera((c) => ({ preset: value, seatId, sequence: c.sequence + 1 }));
  }
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (
        typing(event.target) ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        overlayOpen
      )
        return;
      if (event.code === "Space") {
        event.preventDefault();
        setSpace(true);
      }
      if (!event.repeat) {
        const p = ({ r: "reset", i: "instructor", t: "top" } as const)[
          event.key.toLowerCase() as "r" | "i" | "t"
        ];
        if (p) {
          event.preventDefault();
          setCamera((c) => ({ preset: p, sequence: c.sequence + 1 }));
        }
      }
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === "Space") setSpace(false);
    };
    const release = () => {
      setSpace(false);
      setTouchNavigation(false);
    };
    const hide = () => {
      if (document.hidden) release();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [overlayOpen]);
  function changeSection(id: string) {
    setActiveId(id);
    setSelectedSeat(null);
    setStudentId(null);
    setCandidate("");
    setSearch("");
    setDrawer(false);
  }
  function selectSeat(id: string) {
    setSelectedSeat(id);
    setStudentId(null);
    setCandidate("");
    setDrawer(false);
  }
  function selectStudent(student: Student) {
    setStudentId(student.id);
    setSelectedSeat(
      Object.entries(section?.assignments ?? {}).find(
        ([, id]) => id === student.id,
      )?.[0] ?? null,
    );
    setDrawer(false);
    setCandidate("");
  }
  async function act(action: Action) {
    const ok = await store.dispatch(action);
    if (ok) setNotice("Saved in this browser.");
    return ok;
  }
  function ask(
    title: string,
    body: string,
    label: string,
    run: () => Promise<unknown>,
  ) {
    setConfirmation({ title, body, label, run });
  }
  function backup() {
    downloadText(
      JSON.stringify(store.snapshot, null, 2),
      `cathedra-backup-${new Date().toISOString().slice(0, 10)}.json`,
    );
  }
  async function readBackup(file?: File) {
    if (!file) return;
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error();
      setImported(parseSnapshot(await file.text()));
      setSettings(false);
    } catch {
      setNotice(
        "This backup could not be read. Use a valid Cathedra JSON backup, no larger than 10 MB.",
      );
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  function assignment() {
    if (!section || !selectedSeat || !candidate) return;
    const oldSeat = Object.entries(section.assignments).find(
      ([, id]) => id === candidate,
    )?.[0];
    const occupant = section.assignments[selectedSeat];
    const run = async () => {
      const ok = await act({
        type: "assign",
        sectionId: section.id,
        studentId: candidate,
        seatId: selectedSeat,
      });
      if (ok) {
        setStudentId(null);
        setCandidate("");
      }
    };
    if (oldSeat === selectedSeat) return;
    if (oldSeat || occupant)
      ask(
        oldSeat && occupant ? "Swap these seats?" : "Change this assignment?",
        oldSeat && occupant
          ? `The students in ${oldSeat} and ${selectedSeat} will exchange seats.`
          : oldSeat
            ? `Move this student from ${oldSeat} to ${selectedSeat}.`
            : `The current occupant of ${selectedSeat} will become unassigned.`,
        "Confirm assignment",
        run,
      );
    else void run();
  }
  const seatMap = (
    <div className="flat-map">
      <div className="front-label">Instructor · Front of room</div>
      <div className="flat-rows">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flat-row">
            {[
              `L${i + 1}-3`,
              `L${i + 1}-2`,
              `L${i + 1}-1`,
              "aisle",
              `R${i + 1}-1`,
              `R${i + 1}-2`,
              `R${i + 1}-3`,
              `R${i + 1}-4`,
            ].map((id) =>
              id === "aisle" ? (
                <span className="flat-aisle" key={id} />
              ) : (
                <button
                  key={id}
                  aria-label={`Seat ${id}`}
                  aria-pressed={selectedSeat === id}
                  className={`flat-seat ${occupants[id] ? "occupied" : ""}`}
                  onClick={() => selectSeat(id)}
                >
                  <span>{id}</span>
                  {showNames && occupants[id] ? (
                    <small>{occupants[id]}</small>
                  ) : (
                    <span className="seat-symbol" />
                  )}
                </button>
              ),
            )}
          </div>
        ))}
      </div>
      <p className="muted">Back of room</p>
    </div>
  );
  const recovery = (
    <>
      {store.error && (
        <div role="alert" className="storage-error">
          <strong>Your records need attention.</strong>
          <p>{store.error}</p>
          <div className="actions">
            <button onClick={store.reload} disabled={store.busy}>
              Reload saved data
            </button>
            <button
              onClick={() =>
                store.raw !== null &&
                downloadText(store.raw, "cathedra-original-data.json")
              }
              disabled={store.raw === null}
            >
              Export original data
            </button>
            <button onClick={() => fileRef.current?.click()}>
              Restore backup
            </button>
            <button
              onClick={() =>
                ask(
                  "Reset all local data?",
                  "This permanently removes every section, student, and assignment from this browser. Download a backup first.",
                  "Reset all data",
                  store.reset,
                )
              }
            >
              Reset local data
            </button>
          </div>
        </div>
      )}
    </>
  );
  const common = (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        hidden
        aria-label="Backup file"
        onChange={(e) => void readBackup(e.target.files?.[0])}
      />
      {confirmation && (
        <Dialog
          title={confirmation.title}
          onClose={() => !store.busy && setConfirmation(null)}
        >
          <p>{confirmation.body}</p>
          <div className="actions end">
            <button disabled={store.busy} onClick={() => setConfirmation(null)}>
              Cancel
            </button>
            <button
              className="primary"
              disabled={store.busy}
              onClick={async () => {
                await confirmation.run();
                setConfirmation(null);
              }}
            >
              {confirmation.label}
            </button>
          </div>
        </Dialog>
      )}
      {imported && (
        <Dialog title="Restore this backup?" onClose={() => setImported(null)}>
          <p>
            This replaces all current sections, students, seating, and archives.
          </p>
          <dl className="backup-summary">
            <dt>Sections, including archived</dt>
            <dd>{imported.sections.length}</dd>
            <dt>Students, including archived</dt>
            <dd>
              {imported.sections.reduce((n, s) => n + s.students.length, 0)}
            </dd>
            <dt>Assigned seats</dt>
            <dd>
              {imported.sections.reduce(
                (n, s) => n + Object.keys(s.assignments).length,
                0,
              )}
            </dd>
          </dl>
          <p className="field-help">
            Download your current backup before replacing it. Backup files
            contain personal records.
          </p>
          <div className="actions">
            <button onClick={backup}>Back up current data</button>
            <button
              className="primary"
              disabled={store.busy}
              onClick={async () => {
                if (await store.save(imported, true)) {
                  setImported(null);
                  changeSection("");
                  setNotice("Backup restored in this browser.");
                }
              }}
            >
              Replace all data
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
  if (!store.raw && !store.error && store.snapshot.sections.length === 0)
    return (
      <>
        {common}
        <Onboarding
          onRestore={() => fileRef.current?.click()}
          busy={store.busy}
          onComplete={async (names) => {
            let state = EMPTY_SNAPSHOT;
            for (const name of names)
              state = mutate(state, { type: "createSection", name });
            await store.save(state);
          }}
        />
      </>
    );
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand">
          <GraduationCapIcon weight="duotone" size={29} />
          <span>Cathedra</span>
          <span className="brand-divider" />
          <span className="room-name">
            B2-110 <small>University of Makati</small>
          </span>
        </div>
        <div className="header-actions">
          <span className="local-status">
            <LockSimpleIcon size={15} />
            {store.busy
              ? "Saving…"
              : store.error
                ? "Save paused"
                : "Stored on this device"}
          </span>
          <button
            className="icon-button"
            aria-label="Settings and backups"
            onClick={() => setSettings(true)}
          >
            <GearSixIcon size={22} />
          </button>
        </div>
      </header>
      {recovery}
      <div className="workspace">
        <aside
          className={`directory ${drawer ? "mobile-open" : ""}`}
          aria-label="Student directory"
        >
          <div className="directory-heading">
            <h2>Your classroom</h2>
            <button
              className="icon-button mobile-only"
              aria-label="Close directory"
              onClick={() => setDrawer(false)}
            >
              <XIcon size={20} />
            </button>
          </div>
          <div className="section-select">
            <label htmlFor="section-picker">Active section</label>
            <select
              id="section-picker"
              aria-label="Active section"
              value={section?.id ?? ""}
              onChange={(e) => changeSection(e.target.value)}
            >
              {!sections.length && <option value="">No active sections</option>}
              {sections.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <div className="section-management">
              <button
                onClick={() => setForm({ kind: "section" })}
                disabled={blocked}
              >
                <PlusIcon /> Add section
              </button>
              {section && (
                <button
                  aria-label="Edit section"
                  disabled={blocked}
                  onClick={() => setForm({ kind: "section", section })}
                >
                  <PencilSimpleIcon /> Edit
                </button>
              )}
            </div>
          </div>
          <div className="roster-heading">
            <h3>
              Students <span>{students.length}</span>
            </h3>
            <button
              className="icon-button"
              aria-label="Add student"
              disabled={!section || blocked}
              onClick={() => setForm({ kind: "student" })}
            >
              <PlusIcon size={20} />
            </button>
          </div>
          <label className="search">
            <MagnifyingGlassIcon size={19} />
            <input
              aria-label="Search students"
              type="search"
              placeholder="Find a name or number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <div className="roster-summary">
            <span>{assigned} seated</span>
            <span>{students.length - assigned} unassigned</span>
          </div>
          <div className="student-list">
            {students
              .filter((s) =>
                `${s.name} ${s.number}`
                  .toLocaleLowerCase()
                  .includes(search.toLocaleLowerCase()),
              )
              .map((student) => {
                const seat = Object.entries(section!.assignments).find(
                  ([, id]) => id === student.id,
                )?.[0];
                const identical =
                  students.filter(
                    (s) =>
                      s.name === student.name && s.number === student.number,
                  ).length > 1;
                return (
                  <button
                    className={`student-row ${selectedStudent?.id === student.id ? "selected" : ""}`}
                    key={student.id}
                    onClick={() => selectStudent(student)}
                  >
                    <span className="avatar">
                      {student.name
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </span>
                    <span className="student-label">
                      <strong>{student.name}</strong>
                      <small>
                        {student.number}
                        {identical ? ` · ${student.id.slice(-6)}` : ""}
                      </small>
                    </span>
                    <span className={`seat-tag ${seat ? "" : "unassigned"}`}>
                      {seat ?? "Unassigned"}
                    </span>
                  </button>
                );
              })}
            {!students.length && (
              <div className="directory-empty">
                <UsersIcon size={36} weight="light" />
                <h3>Names make it a classroom.</h3>
                <p>Add your first student, then choose where they sit.</p>
                <button
                  disabled={!section || blocked}
                  onClick={() => setForm({ kind: "student" })}
                >
                  <PlusIcon /> Add student
                </button>
              </div>
            )}
            {students.length > 0 &&
              !students.some((s) =>
                `${s.name} ${s.number}`
                  .toLocaleLowerCase()
                  .includes(search.toLocaleLowerCase()),
              ) && (
                <p className="empty-search">
                  No matching students in this section.
                </p>
              )}
          </div>
          <button className="archive-link" onClick={() => setArchive(true)}>
            <ArchiveIcon size={18} /> Archived records{" "}
            <CaretRightIcon size={15} />
          </button>
          <div className="directory-footer">
            <LockSimpleIcon size={16} />
            <span>
              Only in your browser.
              <br />
              <button onClick={backup}>Download a backup</button>
            </span>
          </div>
        </aside>
        <main className="classroom-main">
          <div className="room-toolbar">
            <div className="room-title">
              <button
                className="icon-button mobile-only"
                aria-label="Open directory"
                onClick={() => setDrawer(true)}
              >
                <ListIcon size={23} />
              </button>
              <div>
                <h1>{section?.name ?? "Your classroom"}</h1>
                <p>
                  {section
                    ? `${assigned} of 42 seats assigned`
                    : "Create a section or restore one from the archive."}
                </p>
              </div>
            </div>
            <div className="view-toggle">
              <button aria-pressed={!flat} onClick={() => setFlat(false)}>
                3D room
              </button>
              <button aria-pressed={flat} onClick={() => setFlat(true)}>
                2D map
              </button>
            </div>
          </div>
          <div className="scene-area">
            <div className="scene-topbar">
              <div className="preset-controls">
                <button onClick={() => preset("reset")} title="Reset view (R)">
                  <ArrowCounterClockwiseIcon size={16} /> Reset <kbd>R</kbd>
                </button>
                <button onClick={() => preset("instructor")}>
                  Instructor <kbd>I</kbd>
                </button>
                <button onClick={() => preset("top")}>
                  Top-down <kbd>T</kbd>
                </button>
              </div>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={showNames}
                  onChange={(e) => setShowNames(e.target.checked)}
                />{" "}
                Show names
              </label>
            </div>
            {flat || webglFailed ? (
              <>
                {webglFailed && !flat && (
                  <p className="fallback-note">
                    3D is unavailable. Your seating map still works below.
                  </p>
                )}
                {seatMap}
              </>
            ) : (
              <SceneBoundary
                fallback={
                  <>
                    <p className="fallback-note">
                      3D is unavailable. Use the seating map below.
                    </p>
                    {seatMap}
                  </>
                }
              >
                <RoomScene
                  selectedSeat={selectedSeat}
                  occupants={occupants}
                  showNames={showNames}
                  navigationEnabled={!overlayOpen && (space || touchNavigation)}
                  cameraCommand={camera}
                  onSelectSeat={selectSeat}
                  onFailure={() => setWebglFailed(true)}
                />
              </SceneBoundary>
            )}
            {!flat && !webglFailed && (
              <div className="scene-hint">
                <span>
                  <kbd>Space</kbd> Hold to navigate{" "}
                  <span className="hint-detail">
                    · Drag to orbit · Right-drag to pan · Scroll to zoom
                  </span>
                </span>
                <button
                  className="touch-toggle"
                  aria-pressed={touchNavigation}
                  onClick={() => setTouchNavigation((v) => !v)}
                >
                  {touchNavigation ? "Finish navigating" : "Navigate room"}
                </button>
              </div>
            )}
          </div>
          <div className="room-bottom">
            <span>
              <MapTrifoldIcon size={16} /> Left 6 × 3{" "}
              <span className="legend-separator" /> Right 6 × 4
            </span>
            <span>Instructor perspective</span>
          </div>
        </main>
        {(selectedSeat || selectedStudent) && (
          <aside className="detail-panel" aria-label="Seat details">
            <div className="detail-heading">
              <span>{selectedSeat ? "Seat details" : "Student details"}</span>
              <button
                className="icon-button"
                aria-label="Close details"
                onClick={() => {
                  setSelectedSeat(null);
                  setStudentId(null);
                }}
              >
                <XIcon size={20} />
              </button>
            </div>
            <div className="detail-content">
              <h2>{selectedSeat ?? "Unassigned"}</h2>
              {selectedSeat && (
                <p className="muted">
                  {selectedSeat.startsWith("L") ? "Left" : "Right"} side · Row{" "}
                  {selectedSeat.slice(1).split("-")[0]}
                </p>
              )}
              {selectedStudent ? (
                <>
                  <div className="detail-avatar">{selectedStudent.name[0]}</div>
                  <h3>{selectedStudent.name}</h3>
                  <p className="student-number">{selectedStudent.number}</p>
                  <p className="field-help">
                    {selectedSeat
                      ? "Assigned to this seat"
                      : "This student does not have a seat yet."}
                  </p>
                  <div className="actions">
                    <button
                      disabled={blocked}
                      onClick={() =>
                        setForm({ kind: "student", student: selectedStudent })
                      }
                    >
                      <PencilSimpleIcon /> Edit student
                    </button>
                    {selectedSeat && (
                      <button
                        onClick={() => {
                          setFlat(false);
                          preset("focus", selectedSeat);
                        }}
                      >
                        <ArrowsOutIcon /> Focus
                      </button>
                    )}
                  </div>
                  <button
                    className="text-button"
                    disabled={blocked}
                    onClick={() =>
                      ask(
                        "Archive this student?",
                        `${selectedStudent.name} will move to the archive and their seat will become available.`,
                        "Archive student",
                        async () => {
                          await act({
                            type: "archiveStudent",
                            sectionId: section!.id,
                            studentId: selectedStudent.id,
                          });
                          setStudentId(null);
                        },
                      )
                    }
                  >
                    Archive student
                  </button>
                </>
              ) : (
                <div className="unoccupied">
                  <UsersIcon size={35} weight="light" />
                  <h3>An open seat.</h3>
                  <p>Choose a student below to make it theirs.</p>
                </div>
              )}
              {selectedSeat && section && (
                <div className="assignment-form">
                  <label>
                    Assign student
                    <select
                      value={candidate}
                      onChange={(e) => setCandidate(e.target.value)}
                      disabled={blocked}
                    >
                      <option value="">Choose a student</option>
                      {students.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} · {s.number}
                          {students.filter(
                            (t) => t.name === s.name && t.number === s.number,
                          ).length > 1
                            ? ` · ${s.id.slice(-6)}`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="primary"
                    disabled={
                      !candidate ||
                      blocked ||
                      section.assignments[selectedSeat] === candidate
                    }
                    onClick={assignment}
                  >
                    Assign to seat
                  </button>
                  {section.assignments[selectedSeat] && (
                    <button
                      disabled={blocked}
                      onClick={() =>
                        ask(
                          "Clear this seat?",
                          "The student will remain in the roster as unassigned.",
                          "Clear seat",
                          async () => {
                            await act({
                              type: "unassign",
                              sectionId: section.id,
                              seatId: selectedSeat,
                            });
                            setStudentId(null);
                          },
                        )
                      }
                    >
                      Clear seat
                    </button>
                  )}
                </div>
              )}
              {!selectedSeat && (
                <p className="field-help">
                  Select an empty seat in the room to assign this student.
                </p>
              )}
            </div>
          </aside>
        )}
      </div>
      <div aria-live="polite" className={`notice ${notice ? "visible" : ""}`}>
        {notice}
        <button
          className="icon-button"
          aria-label="Dismiss message"
          onClick={() => setNotice("")}
        >
          <XIcon size={16} />
        </button>
      </div>
      {common}
      {form && (
        <RecordForm
          key={
            form.kind === "student"
              ? (form.student?.id ?? "new-student")
              : (form.section?.id ?? "new-section")
          }
          form={form}
          students={students}
          busy={blocked}
          error={store.error}
          onClose={() => setForm(null)}
          onSave={async (name, number) => {
            if (form.kind === "section") {
              const ok = await act(
                form.section
                  ? { type: "renameSection", sectionId: form.section.id, name }
                  : { type: "createSection", name },
              );
              if (ok) setForm(null);
            } else if (section) {
              const ok = await act(
                form.student
                  ? {
                      type: "editStudent",
                      sectionId: section.id,
                      studentId: form.student.id,
                      name,
                      number,
                    }
                  : { type: "addStudent", sectionId: section.id, name, number },
              );
              if (ok) setForm(null);
            }
          }}
          onArchive={
            form.kind === "section" && form.section
              ? () => {
                  const target = form.section!;
                  setForm(null);
                  ask(
                    "Archive this section?",
                    `${target.name} and its seating map will remain available in the archive.`,
                    "Archive section",
                    async () => {
                      await act({
                        type: "archiveSection",
                        sectionId: target.id,
                      });
                      changeSection("");
                    },
                  );
                }
              : undefined
          }
        />
      )}
      {settings && (
        <Dialog title="Settings and backups" onClose={() => setSettings(false)}>
          <p>
            Your student records stay in this browser profile. They do not sync
            between devices.
          </p>
          <div className="settings-options">
            <button onClick={backup}>
              <DownloadSimpleIcon size={22} />
              <span>
                <strong>Download backup</strong>
                <small>All sections, students, seating, and archives.</small>
              </span>
            </button>
            <button onClick={() => fileRef.current?.click()}>
              <UploadSimpleIcon size={22} />
              <span>
                <strong>Restore a backup</strong>
                <small>Preview a JSON file before replacing data.</small>
              </span>
            </button>
            <button
              onClick={() => {
                setSettings(false);
                setArchive(true);
              }}
            >
              <ArchiveIcon size={22} />
              <span>
                <strong>Archived records</strong>
                <small>Restore records or remove them permanently.</small>
              </span>
            </button>
          </div>
          <p className="field-help">
            Clearing browser storage removes these records. Backups contain
            personal data. Keep them on a device you trust.
          </p>
          <button
            className="danger-text"
            disabled={store.busy}
            onClick={() => {
              setSettings(false);
              ask(
                "Reset all local data?",
                "This permanently removes all sections, students, seating, and archives from this browser. Download a backup first.",
                "Reset all data",
                store.reset,
              );
            }}
          >
            <TrashIcon /> Reset all local data
          </button>
        </Dialog>
      )}
      {archive && (
        <Dialog title="Archived records" onClose={() => setArchive(false)}>
          <p>
            Restored students return without a seat. Restored sections keep
            their seating map.
          </p>
          <div className="archive-list">
            {store.snapshot.sections.map((s) => (
              <div key={s.id}>
                {s.archived ? (
                  <div className="archive-row">
                    <span>
                      <strong>{s.name}</strong>
                      <small>Section · {s.students.length} students</small>
                    </span>
                    <button
                      disabled={blocked}
                      onClick={() =>
                        void act({ type: "restoreSection", sectionId: s.id })
                      }
                    >
                      Restore
                    </button>
                    <button
                      aria-label={`Delete section ${s.name}`}
                      className="icon-button"
                      disabled={blocked}
                      onClick={() =>
                        ask(
                          "Delete this section permanently?",
                          `All records in ${s.name} will be removed. This cannot be undone.`,
                          "Delete permanently",
                          async () => {
                            await act({
                              type: "deleteSection",
                              sectionId: s.id,
                            });
                          },
                        )
                      }
                    >
                      <TrashIcon size={18} />
                    </button>
                  </div>
                ) : (
                  s.students
                    .filter((student) => student.archived)
                    .map((student) => (
                      <div className="archive-row" key={student.id}>
                        <span>
                          <strong>{student.name}</strong>
                          <small>
                            {s.name} · {student.number} · {student.id.slice(-6)}
                          </small>
                        </span>
                        <button
                          disabled={blocked}
                          onClick={() =>
                            void act({
                              type: "restoreStudent",
                              sectionId: s.id,
                              studentId: student.id,
                            })
                          }
                        >
                          Restore
                        </button>
                        <button
                          aria-label={`Delete student ${student.name}`}
                          className="icon-button"
                          disabled={blocked}
                          onClick={() =>
                            ask(
                              "Delete this student permanently?",
                              `${student.name} will be removed from ${s.name}. This cannot be undone.`,
                              "Delete permanently",
                              async () => {
                                await act({
                                  type: "deleteStudent",
                                  sectionId: s.id,
                                  studentId: student.id,
                                });
                              },
                            )
                          }
                        >
                          <TrashIcon size={18} />
                        </button>
                      </div>
                    ))
                )}
              </div>
            ))}
            {!store.snapshot.sections.some(
              (s) =>
                s.archived || s.students.some((student) => student.archived),
            ) && <p className="empty-search">Your archive is empty.</p>}
          </div>
        </Dialog>
      )}
    </div>
  );
}

function RecordForm({
  error,
  form,
  students,
  busy,
  onClose,
  onSave,
  onArchive,
}: {
  error: string | null;
  form: NonNullable<FormState>;
  students: Student[];
  busy: boolean;
  onClose: () => void;
  onSave: (name: string, number: string) => Promise<void>;
  onArchive?: () => void;
}) {
  const [name, setName] = useState(
    form.kind === "student"
      ? (form.student?.name ?? "")
      : (form.section?.name ?? ""),
  );
  const [number, setNumber] = useState(
    form.kind === "student" ? (form.student?.number ?? "") : "",
  );
  const duplicate =
    form.kind === "student" &&
    students.some(
      (s) =>
        s.id !== form.student?.id &&
        (s.number === number.trim() || s.name === name.trim()),
    );
  const title =
    form.kind === "student"
      ? form.student
        ? "Edit student"
        : "Add a student"
      : form.section
        ? "Edit section"
        : "Add a section";
  return (
    <Dialog title={title} onClose={onClose}>
      {error && (
        <p role="alert" className="error-text">
          {error} Close this dialog to reload saved data.
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim() && (form.kind === "section" || number.trim()))
            void onSave(name.trim(), number.trim());
        }}
      >
        <label>
          {form.kind === "student" ? "Student name" : "Section name"}
          <input
            required
            maxLength={200}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>
        {form.kind === "student" && (
          <label>
            Student number
            <input
              required
              maxLength={100}
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
          </label>
        )}
        {duplicate && (
          <p className="duplicate-note">
            A matching name or number already exists. Saving creates or keeps a
            separate student record.
          </p>
        )}
        <div className="actions end">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary"
            disabled={
              busy ||
              !name.trim() ||
              (form.kind === "student" && !number.trim())
            }
            type="submit"
          >
            {form.kind === "student" ? "Save student" : "Save section"}
          </button>
        </div>
        {onArchive && (
          <button
            type="button"
            className="danger-text"
            disabled={busy}
            onClick={onArchive}
          >
            <ArchiveIcon /> Archive section
          </button>
        )}
      </form>
    </Dialog>
  );
}
