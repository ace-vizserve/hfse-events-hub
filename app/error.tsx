'use client';

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="empty">
      <p>Unable to complete request. Please try again.</p>
      <button style={{ marginTop: 16 }} onClick={reset}>Try again</button>
    </div>
  );
}
