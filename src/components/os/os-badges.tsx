import { Badge } from "@/components/ui/badge";
import type { OsStatus, OsAuthority } from "@/types/os";
import { OS_STATUS, OS_AUTHORITY } from "@/app/(app)/os/_config";

export function StatusBadge({ status }: { status: OsStatus }) {
  const s = OS_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function AuthorityBadge({ authority }: { authority: OsAuthority }) {
  const a = OS_AUTHORITY[authority];
  return <Badge tone={a.tone}>{a.label}</Badge>;
}
