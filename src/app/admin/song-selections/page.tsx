import { SongSelectionsAdmin } from "@/components/admin/song-selections-admin";
import { requirePermissionPageAccess } from "@/lib/access-control";

export default async function AdminSongSelectionsPage() {
  await requirePermissionPageAccess("song_selections.view");
  return <SongSelectionsAdmin />;
}
