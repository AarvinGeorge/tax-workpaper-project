import { renderWork, type PageArgs } from '@/components/work/WorkPage';
import { MemoScreen } from '@/components/work/Memo';

export const dynamic = 'force-dynamic';

// The review memo sits under Review: the same gate (staff only), the same nav entry.
export default function Page(args: PageArgs) {
  return renderWork('review', MemoScreen, args);
}
