import prisma from "@/src/lib/prisma";

/**
 * Returns true if the client has active (non-revoked) access to the project.
 */
export async function requireClientProjectAccess(
  clientId: string,
  projectId: string,
): Promise<boolean> {
  const access = await prisma.clientProjectAccess.findFirst({
    where: {
      clientId,
      projectId,
      revokedAt: null,
    },
    select: { id: true },
  });
  return access !== null;
}
