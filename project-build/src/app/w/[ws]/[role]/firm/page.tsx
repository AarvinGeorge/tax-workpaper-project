import { renderWork, type PageArgs } from '@/components/work/WorkPage';
import { FirmScreen } from '@/components/work/Firm';

export const dynamic = 'force-dynamic';

export default function Page(args: PageArgs) {
  return renderWork('firm', FirmScreen, args);
}
