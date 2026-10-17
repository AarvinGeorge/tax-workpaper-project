import { redirect } from 'next/navigation';
import { newWorkspaceId } from '@/components/shell/lib';

export const dynamic = 'force-dynamic';

/** "New workspace": every visit to the root starts a clean copy of the packet's workpaper. */
export default function Root() {
  redirect(`/w/${newWorkspaceId()}/daniel`);
}
