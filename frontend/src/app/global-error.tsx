"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
          <h2 className="text-xl font-bold text-slate-900 mb-2">Application Error</h2>
          <p className="text-sm text-slate-600 mb-4">{error.message || "A critical error occurred."}</p>
          <button
            onClick={() => reset()}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Refresh Application
          </button>
        </div>
      </body>
    </html>
  );
}
