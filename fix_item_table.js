const fs = require('fs');
const content = fs.readFileSync('components/month-detail.tsx', 'utf8');

const tableBlockStart = content.indexOf('<div className="overflow-x-auto">');
const tableBlockEnd = content.indexOf('</div>', content.indexOf('</table>', tableBlockStart)) + 6;

const mobileCards = `
          {/* Mobil Görünüm (Kartlar) */}
          <div className="grid gap-3 sm:hidden mt-2">
            {items.map((it) => {
              const c = catOf(it.categoryId);
              return (
                <div key={it.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                  <button
                    onClick={() => toggleItem(monthId, kind, it.id)}
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors",
                      it.isCompleted
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-zinc-300 text-transparent hover:border-emerald-500 dark:border-zinc-700"
                    )}
                  >
                    <Check size={16} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-semibold text-sm leading-tight">{it.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge className="px-1.5 py-0 text-[10px]">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full mr-1" style={{ background: c?.color ?? "#999" }} />
                        {c?.name ?? t.month.uncategorized}
                      </Badge>
                      {it.installment ? <span className="text-[10px] text-zinc-500">{it.installment}</span> : null}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="font-bold tabular-nums text-sm">{formatMoney(it.amount, state.settings.currency)}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="!h-7 !w-7" onClick={() => onEdit(it)}>
                        <Pencil size={13} />
                      </Button>
                      <Button variant="ghost" size="icon" className="!h-7 !w-7 text-red-600" onClick={() => setDeleteTarget(it)}>
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Masaüstü Görünüm (Tablo) */}
          <div className="hidden overflow-x-auto sm:block">
`;

let newContent = content.substring(0, tableBlockStart) + mobileCards + content.substring(tableBlockStart + 33 /* length of '<div className="overflow-x-auto">' */);

fs.writeFileSync('components/month-detail.tsx', newContent);
console.log('Fixed ItemTable');
