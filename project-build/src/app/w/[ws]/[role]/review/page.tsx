import { renderWork, type PageArgs } from '@/components/work/WorkPage';
import { ReviewScreen } from '@/components/work/Review';

export const dynamic = 'force-dynamic';

export default function Page(args: PageArgs) {
  return renderWork('review', ReviewScreen, args);
}
