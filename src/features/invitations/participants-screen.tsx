"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { TextField } from "@/components/ui/field";
import { LoadState } from "@/components/ui/load-state";
import { Panel } from "@/components/ui/panel";
import { Pill } from "@/components/ui/pill";
import { useSession } from "@/features/auth/session-provider";
import { plural } from "@/features/lists/list-summary";
import { useLoad } from "@/hooks/use-load";
import { formatMoment } from "@/lib/dates";
import { LIMITS } from "@/lib/validation";
import { errorMessage } from "@/services/errors";
import { cancelInvitation, getListInvitations, invite, removeMember } from "@/services/invitations";
import { getList, getMembers } from "@/services/lists";
import type { Invitation, ListMember, TaskList } from "@/types/api";

type Data = { list: TaskList; members: ListMember[]; pending: Invitation[] };

type InviteState = { identifier: string; error?: string; sent?: string };

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

function InviteForm({ listId, onInvited }: { listId: number; onInvited: () => void }) {
  const [state, formAction, pending] = useActionState<InviteState, FormData>(
    async (_prev, formData) => {
      const identifier = String(formData.get("identifier") ?? "").trim();
      if (!identifier) return { identifier, error: "Escribe el correo o el nombre de usuario." };
      try {
        const invitation = await invite(listId, identifier);
        onInvited();
        return { identifier: "", sent: invitation.invited_username };
      } catch (error) {
        // Persona inexistente, ya participa o ya tiene invitación: se muestran en el campo.
        return { identifier, error: errorMessage(error) };
      }
    },
    { identifier: "" },
  );

  return (
    <form action={formAction} noValidate>
      {state.sent && <Alert tone="success">Invitación enviada a {state.sent}.</Alert>}
      <TextField
        key={state.sent ?? "form"}
        label="Correo electrónico o nombre de usuario"
        name="identifier"
        placeholder="persona@correo.com"
        maxLength={LIMITS.emailMax}
        defaultValue={state.identifier}
        error={state.error}
        hint="Solo se puede invitar a personas que ya tengan una cuenta en TaskIn."
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">ⓘ La invitación quedará pendiente hasta que la otra persona la acepte.</p>
        <Button type="submit" disabled={pending}>
          {pending ? "Enviando…" : "＋ Enviar invitación"}
        </Button>
      </div>
    </form>
  );
}

/**
 * WF-005 Gestionar participantes (RF-11, RF-12, RF-14). Solo para el
 * propietario de una lista compartida: invitar por correo o usuario (D-13),
 * expulsar (sus asignaciones se quitan, las tareas quedan; CA-23) y cancelar
 * invitaciones pendientes.
 */
export function ParticipantsScreen({ listId }: { listId: number }) {
  const { user } = useSession();
  const [actionError, setActionError] = useState<string | null>(null);
  const { load, reload } = useLoad<Data>(async () => {
    const [list, members] = await Promise.all([getList(listId), getMembers(listId)]);
    // Solo el propietario de una lista compartida puede ver las invitaciones (403 para el resto).
    const canManage = list.owner_id === user.id && list.list_type === "shared";
    const pending = canManage ? await getListInvitations(listId) : [];
    return { list, members, pending };
  }, listId);

  return (
    <LoadState load={load} loading="Cargando participantes…" onRetry={reload}>
      {({ list, members, pending }) => {
        const back = (
          <ButtonLink href={`/lists/${list.id}`} variant="ghost">
            ← Volver a la lista
          </ButtonLink>
        );
        const header = (
          <PageHeader
            eyebrow={
              <>
                <Link href="/lists" className="hover:underline">
                  Mis listas
                </Link>{" "}
                /{" "}
                <Link href={`/lists/${list.id}`} className="hover:underline">
                  {list.name}
                </Link>
              </>
            }
            title="Gestionar participantes"
            description="Administra quién forma parte de esta lista compartida."
            actions={back}
          />
        );

        if (list.list_type !== "shared" || list.owner_id !== user.id) {
          return (
            <>
              {header}
              <Alert>
                {list.list_type !== "shared"
                  ? "Las listas personales no admiten participantes."
                  : "Solo el propietario de la lista gestiona sus participantes."}
              </Alert>
            </>
          );
        }

        const run = async (action: () => Promise<void>) => {
          setActionError(null);
          await action();
          reload();
        };

        return (
          <>
            {header}
            {actionError && <Alert>{actionError}</Alert>}
            <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(260px,0.9fr)]">
              <div className="flex flex-col gap-5">
                <Panel
                  title="Invitar a una persona"
                  description="Busca a un usuario registrado por correo electrónico o nombre de usuario."
                >
                  <InviteForm listId={list.id} onInvited={reload} />
                </Panel>

                <Panel title="Participantes actuales" actions={<span className="text-sm text-muted">{plural(members.length, "persona")}</span>}>
                  <ul className="flex flex-col">
                    {members.map((m) => (
                      <li key={m.user_id} className="flex flex-wrap items-center gap-3 border-b border-line py-3 last:border-b-0">
                        <span
                          aria-hidden="true"
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-chip text-xs font-bold"
                        >
                          {initials(m.username)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                          {m.username}
                          {m.user_id === user.id && <span className="font-normal text-muted"> · Tú</span>}
                        </span>
                        <Pill>{m.is_owner ? "Propietario" : "Participante"}</Pill>
                        {!m.is_owner && (
                          <ConfirmButton
                            label="Expulsar"
                            className="px-3 py-2"
                            title={`¿Expulsar a ${m.username}?`}
                            confirmLabel="Expulsar"
                            pendingLabel="Expulsando…"
                            onConfirm={() => run(() => removeMember(list.id, m.user_id))}
                          >
                            Perderá el acceso a «{list.name}» y dejará de ser responsable de sus tareas. Las tareas se
                            quedan en la lista. Podrás volver a invitarle.
                          </ConfirmButton>
                        )}
                      </li>
                    ))}
                  </ul>
                </Panel>

                <Panel title={`Invitaciones pendientes · ${pending.length}`}>
                  {pending.length === 0 ? (
                    <p className="text-sm text-muted">No hay invitaciones pendientes.</p>
                  ) : (
                    <ul className="flex flex-col">
                      {pending.map((inv) => (
                        <li key={inv.id} className="flex flex-wrap items-center gap-3 border-b border-line py-3 last:border-b-0">
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{inv.invited_username}</span>
                          <Badge tone="warning">Pendiente</Badge>
                          <span className="text-xs text-muted">Enviada {formatMoment(inv.created_at).toLowerCase()}</span>
                          <Button
                            variant="ghost"
                            className="px-3 py-2"
                            aria-label={`Cancelar la invitación de ${inv.invited_username}`}
                            onClick={() =>
                              run(() => cancelInvitation(list.id, inv.id)).catch((e: unknown) => setActionError(errorMessage(e)))
                            }
                          >
                            Cancelar
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-3 text-xs text-muted">Puedes cancelar una invitación mientras no haya sido aceptada.</p>
                </Panel>
              </div>

              <div className="flex flex-col gap-5">
                <Panel title="Permisos del propietario">
                  <ul className="flex flex-col gap-2 text-sm">
                    <li>✓ Invitar a nuevos participantes</li>
                    <li>✓ Cancelar invitaciones pendientes</li>
                    <li>✓ Expulsar participantes</li>
                  </ul>
                </Panel>
                <Panel title="Importante">
                  <p className="text-sm leading-normal text-muted">
                    Al expulsar a alguien, sus asignaciones se eliminan de las tareas, pero las tareas permanecen en la lista.
                  </p>
                </Panel>
              </div>
            </div>
          </>
        );
      }}
    </LoadState>
  );
}
