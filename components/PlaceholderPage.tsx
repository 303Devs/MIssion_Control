export default function PlaceholderPage({
  title,
}: {
  title: string;
}) {
  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="rounded-2xl border border-gray-800 bg-gray-900/70 px-8 py-12 text-center shadow-2xl shadow-black/20">
        <div className="mb-3 text-xs font-mono uppercase tracking-[0.35em] text-emerald-400">
          Mission Control
        </div>
        <h1 className="text-3xl font-semibold text-white">{title}</h1>
      </div>
    </div>
  );
}
