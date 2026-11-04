import { Badge } from "@/components/ui/badge.tsx";
import { exposureLabels } from "@/format.ts";
import type { QuantumExposure } from "@server/types.ts";

interface Props {
  exposure: QuantumExposure;
  pastHorizon: boolean;
}

/** One mark per row: whether the algorithm holds, and when it breaks, whether the data outlives the horizon. */
export function ExposureBadge({ exposure, pastHorizon }: Props) {
  if (pastHorizon) return <Badge variant="negative">Past horizon</Badge>;
  if (exposure === "safe") return <Badge variant="positive">{exposureLabels.safe}</Badge>;
  if (exposure === "weakened") return <Badge variant="warning">{exposureLabels.weakened}</Badge>;
  return <span className="text-muted">{exposureLabels.vulnerable}</span>;
}
