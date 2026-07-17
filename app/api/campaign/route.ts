import { getConfiguredSubmissionWindow } from "@/lib/campaign-settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const campaign = await getConfiguredSubmissionWindow();

  return Response.json(
    {
      status: campaign.status,
      startAt: campaign.startAt?.toISOString() ?? null,
      endAt: campaign.endAt?.toISOString() ?? null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}