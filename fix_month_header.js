const fs = require('fs');
let content = fs.readFileSync('components/month-detail.tsx', 'utf8');

const oldHeader = `<div className="flex flex-wrap items-center gap-2">
          <Link href="/">
            <Button variant="outline" size="sm">
              <ArrowLeft size={15} /> {t.month.allMonths}
            </Button>
          </Link>
          <div className="mx-auto flex items-center gap-1">`;

const newHeader = `<div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <ArrowLeft size={15} className="mr-1" /> {t.month.allMonths}
            </Button>
          </Link>
          <div className="flex items-center gap-1 order-first sm:order-none">`;

const oldRightBtn = `          <Button variant="outline" size="sm" onClick={() => setShowCats(true)}>
            <Settings2 size={15} /> {t.month.categories}
          </Button>
        </div>`;

const newRightBtn = `          <Button variant="outline" size="sm" onClick={() => setShowCats(true)} className="w-full sm:w-auto">
            <Settings2 size={15} className="mr-1" /> {t.month.categories}
          </Button>
        </div>`;

content = content.replace(oldHeader, newHeader);
content = content.replace(oldRightBtn, newRightBtn);

fs.writeFileSync('components/month-detail.tsx', content);
