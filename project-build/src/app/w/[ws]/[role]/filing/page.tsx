import { renderWork, type PageArgs } from '@/components/work/WorkPage';
import { FilingScreen } from '@/components/work/Filing';

export const dynamic = 'force-dynamic';

export default function Page(args: PageArgs) {
  return renderWork('filing', FilingScreen, args);
}
