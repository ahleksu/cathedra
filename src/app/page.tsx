"use client";
import dynamic from "next/dynamic";
const Classroom = dynamic(() => import("../components/classroom"), {
  ssr: false,
  loading: () => (
    <main className="loading-shell">
      <h1>Cathedra</h1>
      <p>Opening your classroom…</p>
    </main>
  ),
});
export default function Page() {
  return <Classroom />;
}
