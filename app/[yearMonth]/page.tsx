import { MonthDetail } from "@/components/month-detail";

export function generateStaticParams() {
  return [];
}

export default function MonthPage({ params }: { params: { yearMonth: string } }) {
  return <MonthDetail yearMonth={params.yearMonth} />;
}
