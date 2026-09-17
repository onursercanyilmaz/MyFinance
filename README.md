# MyFinance

MyFinance is a bilingual personal wallet app for tracking monthly income, expenses, cash on hand and investments. It runs entirely in the browser, keeps data locally, and supports JSON import/export for backups.

MyFinance, aylık gelir-giderlerinizi, eldeki nakdinizi ve yatırımlarınızı takip etmek için hazırlanmış iki dilli bir kişisel cüzdan uygulamasıdır. Tüm veriler tarayıcınızda saklanır; yedekleme için JSON içe/dışa aktarma vardır.

## Features

- Personal wallet dashboard with editable cash balance
- Monthly budget cards with income, expense, planned net and completion progress
- Detailed month pages with categories, notes, installments and charts
- Investment tracking kept separate from cash budget
- Turkish and English interface
- Light/dark theme support
- Local-first storage with JSON backup and restore
- Custom MyFinance wallet logo and favicon

## Ozellikler

- Düzenlenebilir eldeki nakit alanı olan kişisel cüzdan panosu
- Gelir, gider, planlanan net ve tamamlanma durumunu gösteren aylık bütçe kartları
- Kategori, not, taksit ve grafik destekli ay detay sayfaları
- Nakit bütçeden ayrı yatırım takibi
- Türkçe ve İngilizce arayüz
- Açık/koyu tema desteği
- Tarayıcıda yerel saklama ve JSON yedekleme
- MyFinance için cüzdan temalı logo ve favicon

## Tech Stack

- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Recharts
- lucide-react

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Data And Privacy

MyFinance stores budget data under the `myfinance-budget-v1` localStorage key. Data does not leave the browser unless you export it manually as JSON and share that file yourself.

MyFinance bütçe verilerini `myfinance-budget-v1` localStorage anahtarında saklar. JSON olarak dışa aktarmadığınız sürece veriler tarayıcınızdan ayrılmaz.

## Backup

Use **Export** regularly to download a JSON backup. Use **Import** to restore a previous backup on the same browser or another device.

Düzenli olarak **Dışa Aktar** ile JSON yedeği alın. Eski bir yedeği aynı tarayıcıda veya başka bir cihazda geri yüklemek için **İçe Aktar** özelliğini kullanın.
