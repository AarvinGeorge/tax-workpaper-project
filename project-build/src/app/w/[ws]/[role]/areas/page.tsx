import { renderWork, type PageArgs } from '@/components/work/WorkPage';
import { AreasScreen } from '@/components/work/Areas';

export const dynamic = 'force-dynamic';

export default function Page(args: PageArgs) {
  return renderWork('areas', AreasScreen, args);
}
