/** O que ocupa o lugar do conteúdo enquanto os números vêm do banco. */
export default function Carregando() {
  return (
    <div className="animate-pulse space-y-6" aria-label="carregando" role="status">
      <div className="h-5 w-40 rounded bg-areia" />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="h-24 rounded-2xl border border-borda bg-areia/40" />
        <div className="h-24 rounded-2xl border border-borda bg-areia/40" />
        <div className="h-24 rounded-2xl border border-borda bg-areia/40" />
      </div>
      <div className="h-5 w-32 rounded bg-areia" />
      <div className="h-40 rounded-2xl border border-borda bg-areia/40" />
    </div>
  );
}
