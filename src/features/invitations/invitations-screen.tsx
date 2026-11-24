"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadState } from "@/components/ui/load-state";
import { Panel } from "@/components/ui/panel";
import { plural } from "@/features/lists/list-summary";
import { useLoad } from "@/hooks/use-load";
import { formatDate } from "@/lib/dates";
import { errorMessage } from "@/services/errors";
import { acceptInvitation, getReceivedInvitations, rejectInvitation } from "@/services/invitations";
import type { Invitation } from "@/types/api";
import { useInboxCounts } from "@/features/inbox/inbox-counts";

function InvitationCard({ invitation, onDone }: { invitation: Invitation; onDone: (error?: string, listId?: number) => void }) {
  const [pending, setPending] = useState<"accept" | "reject" | null>(null);

  const respond = async (action: "accept" | "reject") => {
    setPending(action);
    try {
      const result = action === "accept" ? await acceptInvitation(invitation.id) : await rejectInvitation(invitation.id);
      onDone(undefined, action === "accept" ? result.list_id : undefined);
    } catch (error) {
      onDone(errorMessage(error));
    } finally {
      setPending(null);
    }
  };

  return (
    <li className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-panel-2 p-4">
      <span
        aria-hidden="true"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-[9px] bg-accent-tint text-sm font-bold text-accent-text"
      >
        {invitation.list_name.slice(0, 2).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <strong className="block truncate text-sm">{invitation.list_name}</strong>
        <small className="text-xs text-muted">
          Invitación de {invitation.owner_username} · {formatDate(invitation.created_at)}
        </small>
      </div>
      <Badge>Lista compartida</Badge>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          disabled={pending !== null}
          aria-label={`Rechazar la invitación a ${invitation.list_name}`}
          onClick={() => respond("reject")}
        >
          {pending === "reject" ? "Rechazando…" : "Rechazar"}
        </Button>
        <Button
          disabled={pending !== null}
          aria-label={`Aceptar la invitación a ${invitation.list_name}`}
          onClick={() => respond("accept")}
        >
          {pending === "accept" ? "Aceptando…" : "Aceptar invitación"}
        </Button>
      </div>
    </li>
  );
}

/**
 * WF-013 Invitaciones recibidas (RF-11, RF-12): las pendientes, con aceptar o
 * rechazar. Al aceptar, la lista aparece en «Mis listas» (CA-07).
 */
export function InvitationsScreen() {
  const router = useRouter();
  const { refresh: refreshCounts } = useInboxCounts();
  const [message, setMessage] = useState<{ tone: "danger" | "success"; text: string } | null>(null);
  const { load, reload } = useLoad(getReceivedInvitations);

  const done = (error?: string, acceptedListId?: number) => {
    reload();
    refreshCounts();
    if (error) setMessage({ tone: "danger", text: error });
    else if (acceptedListId) router.push(`/lists/${acceptedListId}`);
    else setMessage({ tone: "success", text: "Invitación rechazada." });
  };

  return (
    <>
      <PageHeader eyebrow="Colaboración" title="Invitaciones recibidas" description="Revisa las invitaciones a listas compartidas." />
      {message && <Alert tone={message.tone}>{message.text}</Alert>}
      <LoadState load={load} loading="Cargando invitaciones…" onRetry={reload}>
        {(invitations) => (
          <Panel
            title="Pendientes de respuesta"
            actions={<span className="text-sm text-muted">{plural(invitations.length, "invitación", "invitaciones")}</span>}
          >
            {invitations.length === 0 ? (
              <p className="rounded-panel border border-dashed border-line p-6 text-center text-sm text-muted">
                No tienes invitaciones pendientes.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {invitations.map((invitation) => (
                  <InvitationCard key={invitation.id} invitation={invitation} onDone={done} />
                ))}
              </ul>
            )}
            <p className="mt-4 text-xs leading-normal text-muted">
              Al aceptar, pasarás a formar parte de la lista y podrás consultar y gestionar sus tareas. Una invitación
              pendiente no concede acceso.
            </p>
          </Panel>
        )}
      </LoadState>
    </>
  );
}
