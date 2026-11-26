export default function Home() {
  return (
    <main className="min-h-dvh flex flex-col">
      <header className="flex items-center justify-between px-4 py-4 border-b border-neutral-200">
        <span className="text-lg font-bold">Piktoéo</span>
        <a
          href="#"
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-dark"
        >
          Commencer
        </a>
      </header>
      <section className="flex flex-1 flex-col items-center justify-center gap-3 px-4 text-center">
        <h1 className="text-2xl font-bold">Le projet est en place ✅</h1>
        <p className="text-neutral-600">La vraie page d&apos;accueil arrive à l&apos;étape 1.</p>
      </section>
    </main>
  );
}
