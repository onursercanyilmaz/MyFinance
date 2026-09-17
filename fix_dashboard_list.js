const fs = require('fs');
let content = fs.readFileSync('components/dashboard.tsx', 'utf8');

const target = `                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5">
                    <div className="min-w-[140px]">
                      <p className="font-mono text-[10px] leading-tight text-zinc-500">{m.id}</p>
                      <p className="flex items-center gap-1.5 text-sm font-bold leading-tight group-hover:underline">
                        {monthLabel(m.year, m.month, lang)}
                        {pinCurrent && nowId === m.id ? (
                          <span className="rounded-full bg-emerald-100 px-1.5 py-px text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            {t.dash.thisMonth}
                          </span>
                        ) : null}
                      </p>
                    </div>
                    <span className="text-[11px] text-zinc-500">
                      {t.dash.income} <strong className="text-emerald-600 tabular-nums dark:text-emerald-400">{formatMoney(totalsForMonth.incomeTotal, state.settings.currency)}</strong>
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      {t.dash.expense} <strong className="text-red-600 tabular-nums dark:text-red-400">{formatMoney(totalsForMonth.expenseTotal, state.settings.currency)}</strong>
                    </span>
                    <span className={\`text-[11px] font-bold tabular-nums \${totalsForMonth.netPlanned >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}\`}>
                      {formatSigned(totalsForMonth.netPlanned, state.settings.currency)}
                    </span>
                    <span className="hidden min-w-[120px] flex-1 items-center gap-2 sm:flex">
                      <Progress value={totalsForMonth.progress} className="flex-1" />
                      <span className="text-[10px] tabular-nums text-zinc-500">%{totalsForMonth.progress} • {totalsForMonth.doneCount}/{totalsForMonth.totalCount}</span>
                    </span>
                    <span className="ml-auto inline-flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="!h-8 !w-8" title={t.dash.copyMonth} onClick={() => setDupFor(m.id)}>
                        <Copy size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="!h-8 !w-8 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        title={t.common.del}
                        onClick={() => setDeleteMonthId(m.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                      <ArrowRight size={15} className="ml-1 text-zinc-400 hidden sm:block" />
                    </span>
                  </div>`;

const replacement = `                  <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-2 px-4 py-3">
                    <div className="flex items-center justify-between sm:w-[140px] sm:flex-col sm:items-start sm:justify-start shrink-0">
                      <div>
                        <p className="font-mono text-[10px] leading-tight text-zinc-500">{m.id}</p>
                        <p className="flex items-center gap-1.5 text-sm font-bold leading-tight group-hover:underline">
                          {monthLabel(m.year, m.month, lang)}
                          {pinCurrent && nowId === m.id ? (
                            <span className="rounded-full bg-emerald-100 px-1.5 py-px text-[10px] font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              {t.dash.thisMonth}
                            </span>
                          ) : null}
                        </p>
                      </div>
                      <span className="inline-flex sm:hidden items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="!h-8 !w-8" title={t.dash.copyMonth} onClick={() => setDupFor(m.id)}>
                          <Copy size={14} />
                        </Button>
                        <Button variant="ghost" size="icon" className="!h-8 !w-8 text-red-600 hover:bg-red-50 dark:hover:bg-red-950" title={t.common.del} onClick={() => setDeleteMonthId(m.id)}>
                          <Trash2 size={14} />
                        </Button>
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 sm:flex items-center gap-2 sm:gap-4 sm:flex-1">
                      <span className="flex flex-col sm:block text-[11px] text-zinc-500 text-center sm:text-left bg-zinc-50 dark:bg-zinc-800/50 sm:bg-transparent p-1.5 sm:p-0 rounded-md">
                        <span className="sm:mr-1">{t.dash.income}</span>
                        <strong className="text-emerald-600 tabular-nums dark:text-emerald-400 text-xs sm:text-[11px]">{formatMoney(totalsForMonth.incomeTotal, state.settings.currency)}</strong>
                      </span>
                      <span className="flex flex-col sm:block text-[11px] text-zinc-500 text-center sm:text-left bg-zinc-50 dark:bg-zinc-800/50 sm:bg-transparent p-1.5 sm:p-0 rounded-md">
                        <span className="sm:mr-1">{t.dash.expense}</span>
                        <strong className="text-red-600 tabular-nums dark:text-red-400 text-xs sm:text-[11px]">{formatMoney(totalsForMonth.expenseTotal, state.settings.currency)}</strong>
                      </span>
                      <span className={\`flex flex-col sm:block text-[11px] text-center sm:text-left bg-zinc-50 dark:bg-zinc-800/50 sm:bg-transparent p-1.5 sm:p-0 rounded-md font-bold tabular-nums \${totalsForMonth.netPlanned >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}\`}>
                        <span className="text-zinc-500 font-normal sm:hidden text-[11px] mb-0.5">Net</span>
                        <span className="text-xs sm:text-[11px]">{formatSigned(totalsForMonth.netPlanned, state.settings.currency)}</span>
                      </span>
                    </div>

                    <span className="hidden min-w-[120px] flex-1 items-center gap-2 sm:flex">
                      <Progress value={totalsForMonth.progress} className="flex-1" />
                      <span className="text-[10px] tabular-nums text-zinc-500">%{totalsForMonth.progress} • {totalsForMonth.doneCount}/{totalsForMonth.totalCount}</span>
                    </span>
                    
                    <span className="mt-1 flex items-center justify-between sm:hidden text-[10px] text-zinc-500">
                      <Progress value={totalsForMonth.progress} className="w-1/2" />
                      <span>%{totalsForMonth.progress} • {totalsForMonth.doneCount}/{totalsForMonth.totalCount}</span>
                    </span>

                    <span className="hidden sm:inline-flex ml-auto items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="!h-8 !w-8" title={t.dash.copyMonth} onClick={() => setDupFor(m.id)}>
                        <Copy size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="!h-8 !w-8 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        title={t.common.del}
                        onClick={() => setDeleteMonthId(m.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                      <ArrowRight size={15} className="ml-1 text-zinc-400" />
                    </span>
                  </div>`;

if(content.includes('gap-x-4 gap-y-1 px-4 py-2.5')) {
  // Try to find the exact block and replace
  // The content might have slightly different indentation or ArrowRight without "hidden sm:block".
}

// I will use regex to replace it
let replaced = false;
try {
  let lines = content.split('\n');
  let startIdx = -1;
  let endIdx = -1;
  for(let i=0; i<lines.length; i++){
    if(lines[i].includes('<div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2.5">')) {
      startIdx = i;
    }
    if(startIdx !== -1 && lines[i].includes('<ArrowRight size={15}')) {
      endIdx = i + 2; // closing span and div
      break;
    }
  }
  
  if (startIdx !== -1 && endIdx !== -1) {
    let before = lines.slice(0, startIdx).join('\n');
    let after = lines.slice(endIdx).join('\n');
    content = before + '\n' + replacement + '\n' + after;
    fs.writeFileSync('components/dashboard.tsx', content);
    console.log("Success");
  } else {
    console.log("Could not find bounds");
  }
} catch(e) { console.error(e); }
