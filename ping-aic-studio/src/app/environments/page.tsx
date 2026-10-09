import { getEnvironments } from "@/lib/fr-config";
import { triggerStaleRefreshAsync } from "@/lib/release/auto-refresh";
import { EnvironmentsManager } from "./EnvironmentsManager";

// Never serve a cached env list — imports/edits change it on disk.
export const dynamic = "force-dynamic";

export default function EnvironmentsPage() {
  triggerStaleRefreshAsync();
  const environments = getEnvironments();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Environments</h1>
        <p className="section-subtitle mt-1">
          Configure your Ping AIC tenant environments and their credentials.
        </p>
      </div>
      <EnvironmentsManager initialEnvironments={environments} />
    </div>
  );
}
