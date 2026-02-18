import { getAvailableProjectsAction } from "./actions";
import InviteClientForm from "./invite-client-form";

export default async function InviteClientPage() {
  const { projects = [], error: loadError = null } = await getAvailableProjectsAction().then((result) => {
    if (result.ok) {
      return { projects: result.projects };
    }
    return { error: result.error };
  });

  return (
    <main className="app-container">
      <div className="stack-6">
        <header className="stack-2">
          <h1 className="page-title">Invite client</h1>
          <p className="muted">Invite a client to view a specific project.</p>
        </header>

        <section className="card">
          <InviteClientForm projects={projects} loadError={loadError} />
        </section>
      </div>
    </main>
  );
}
