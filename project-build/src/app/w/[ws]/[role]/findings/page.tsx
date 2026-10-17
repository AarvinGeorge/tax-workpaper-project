import { renderWork, type PageArgs } from '@/components/work/WorkPage';
import { FindingsScreen } from '@/components/work/Findings';

export const dynamic = 'force-dynamic';

export default function Page(args: PageArgs) {
  return renderWork('findings', FindingsScreen, args);
}
