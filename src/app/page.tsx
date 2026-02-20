import TofuApp from "@/components/TofuApp";
import { Suspense } from "react";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 p-8 flex justify-center">
      <div className="w-full max-w-7xl">
        <Suspense fallback={<div>Loading...</div>}>
          <TofuApp />
        </Suspense>
      </div>
    </main>
  );
}
