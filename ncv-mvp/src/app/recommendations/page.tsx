import { Suspense } from "react";
import RecommendationsClient from "./RecommendationsClient";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white">
          <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
            <div className="h-5 w-40 animate-pulse rounded bg-slate-100" />
            <div className="h-8 w-72 animate-pulse rounded bg-slate-100" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div
                  key={idx}
                  className="h-24 animate-pulse rounded-lg border border-slate-200 bg-slate-100"
                />
              ))}
            </div>
          </main>
        </div>
      }
    >
      <RecommendationsClient />
    </Suspense>
  );
}
