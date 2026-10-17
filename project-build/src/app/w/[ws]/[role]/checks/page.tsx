import { renderWork, type PageArgs } from '@/components/work/WorkPage';
import { ChecksScreen } from '@/components/work/Checks';

export const dynamic = 'force-dynamic';

export default function Page(args: PageArgs) {
  return renderWork('checks', ChecksScreen, args);
}
