import { json } from '@/lib/response';
import { getMembershipConfigRecord } from '@/queries/prisma/membership-config';

export async function GET() {
  const { config, version, updatedAt } = await getMembershipConfigRecord();
  return json({ config, version, updatedAt });
}
