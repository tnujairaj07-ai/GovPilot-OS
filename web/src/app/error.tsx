"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong!</h2>
      <p className="text-sm text-slate-600 mb-4">{error.message || "An unexpected error occurred."}</p>
      <button
        onClick={() => reset()}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  );
}
