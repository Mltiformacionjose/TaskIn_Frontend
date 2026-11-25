/**
 * Casilla «Exigir fecha límite» de los diálogos de lista (RF-28). Envía
 * `due_date_required=on` en el formulario cuando está marcada.
 */
export function DueDateRequiredOption({ defaultChecked }: { defaultChecked: boolean }) {
  return (
    <label className="mb-[19px] flex cursor-pointer items-start gap-3 rounded-[9px] border border-line bg-panel-2 p-[13px]">
      <input
        type="checkbox"
        name="due_date_required"
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 accent-accent"
      />
      <span>
        <strong className="block text-sm">Exigir fecha límite</strong>
        <small className="mt-1 block text-xs leading-normal text-muted">
          Cada tarea nueva, y cada una que se edite, tendrá que llevar fecha. Las que ya existen sin fecha no cambian.
        </small>
      </span>
    </label>
  );
}
