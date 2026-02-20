import TofuApp from "@/components/TofuApp";
import { Suspense } from "react";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 app-container">
      <Suspense fallback={<div>Loading...</div>}>
        <TofuApp />
      </Suspense>
    </main>
  );
}
