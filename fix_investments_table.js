const fs = require('fs');
const content = fs.readFileSync('components/investments.tsx', 'utf8');

const tableBlockStart = content.indexOf('<div className="overflow-x-auto">');
const tableBlockEnd = content.indexOf('</div>', content.indexOf('</table>', tableBlockStart)) + 6;

const mobileCards = `
            <>
              {/* Mobil Görünüm (Kartlar) */}
              <div className="grid gap-3 sm:hidden mt-2">
                {list.map((v) => {
                  const q = Number(v.quantity) || 0;
                  const val = v.currentPrice != null ? q * v.currentPrice : null;
                  return (
                    <div key={v.id} className="flex flex-col gap-2 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-sm leading-tight">{v.name}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Badge className="px-1.5 py-0 text-[10px]">{KIND_LABEL[v.kind] ?? v.kind}</Badge>
                            {v.note || v.date ? (
                              <span className="text-[10px] text-zinc-500">{[v.date, v.note].filter(Boolean).join(" • ")}</span>
                            ) : null}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="!h-7 !w-7" onClick={() => setEditing({ item: v })}>
                            <Pencil size={13} />
                          </Button>
                          <Button variant="ghost" size="icon" className="!h-7 !w-7 text-red-600" onClick={() => setDeleteTarget(v)}>
                            <Trash2 size={13} />
                          </Button>
                        </div>
                      </div>
                      <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-zinc-50 p-2 rounded-lg dark:bg-zinc-900">
                          <p className="text-zinc-500 mb-0.5">Miktar</p>
                          <p className="font-semibold">{q} {v.unit}</p>
                        </div>
                        <div className="bg-zinc-50 p-2 rounded-lg dark:bg-zinc-900">
                          <p className="text-zinc-500 mb-0.5">Değer</p>
                          <p className="font-semibold">{val != null ? formatMoney(val, state.settings.currency) : "—"}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Masaüstü Görünüm (Tablo) */}
              <div className="hidden overflow-x-auto sm:block">
`;

let newContent = content.substring(0, tableBlockStart) + mobileCards + content.substring(tableBlockStart + 33);
// need to also close the fragment
const closingFragment = `</div>
            </>`;
newContent = newContent.replace('</div>\n          )}', closingFragment + '\n          )}');

fs.writeFileSync('components/investments.tsx', newContent);
console.log('Fixed Investments Table');
