import { Suspense } from "react";
import HomeClient from "./HomeClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white">
          <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
            <div className="h-6 w-40 animate-pulse rounded bg-slate-100" />
            <div className="h-8 w-72 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded-md border border-slate-200 bg-slate-50"
                />
              ))}
            </div>
          </main>
        </div>
      }
    >
      <HomeClient />
    </Suspense>
  );
}
