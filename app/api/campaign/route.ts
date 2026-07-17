import { getSubmissionWindow } from "@/lib/submission-window";

export const dynamic = "force-dynamic";

export function GET() {
  const campaign = getSubmissionWindow();

  return Response.json(
    {
      status: campaign.status,
      startAt: campaign.startAt?.toISOString() ?? null,
      endAt: campaign.endAt?.toISOString() ?? null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}