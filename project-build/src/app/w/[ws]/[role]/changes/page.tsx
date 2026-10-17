import { renderWork, type PageArgs } from '@/components/work/WorkPage';
import { ChangesScreen } from '@/components/work/Changes';

export const dynamic = 'force-dynamic';

export default function Page(args: PageArgs) {
  return renderWork('changes', ChangesScreen, args);
}
