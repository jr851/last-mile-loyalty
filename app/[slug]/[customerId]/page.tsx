export const runtime = 'edge';
import { redirect } from "next/navigation";

/**
 * Backwards-compatible redirect for old SMS links.
 * Old format: /leo-and-anna-cafe/3c12554d-61e3-4562-a6a1-2ccad67bfd5f
 * New format: /card/?b=leo-and-anna-cafe&c=3c12554d-61e3-4562-a6a1-2ccad67bfd5f
 */
export default async function LegacyCardRedirect({
  params,
}: {
  params: Promise<{ slug: string; customerId: string }>;
}) {
  const { slug, customerId } = await params;
  redirect(`/card/?b=${encodeURIComponent(slug)}&c=${encodeURIComponent(customerId)}`);
}
