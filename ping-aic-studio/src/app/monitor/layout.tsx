import { SubTabNav } from "@/components/SubTabNav";

export default function MonitorLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <div>
                <h1 className="page-title">Monitor</h1>
                <p className="section-subtitle mt-1">
                    Health and status across server endpoints and Remote Connector Server clusters.
                </p>
            </div>
            <SubTabNav
                tabs={[
                    { href: "/monitor/server-status", label: "Server Status" },
                    { href: "/monitor/tls", label: "TLS Expiration" },
                    { href: "/monitor/rcs-status", label: "RCS Status" },
                    { href: "/monitor/history", label: "History" },
                ]}
            />
            {children}
        </div>
    );
}
