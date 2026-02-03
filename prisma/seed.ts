import "dotenv/config";
import { PrismaClient, ProjectStatus, Role } from "./generated/client";
import { PrismaPg } from "@prisma/adapter-pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

const AGENCY_ID = "seed_demo_agency";
const AGENCY_NAME = "Demo Agency";
const OWNER_EMAIL = "owner@demo.com";
const OWNER_NAME = "Demo Owner";
const CLIENT_EMAIL = "client@demo.com";
const CLIENT_NAME = "Demo Client";

const addDays = (base: Date, days: number) => {
  const date = new Date(base);
  date.setDate(date.getDate() + days);
  return date;
};

async function seed() {
  const now = new Date();

  const owner = await prisma.user.upsert({
    where: { email: OWNER_EMAIL },
    update: {
      name: OWNER_NAME,
      emailVerified: true,
      updatedAt: now,
    },
    create: {
      name: OWNER_NAME,
      email: OWNER_EMAIL,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    },
  });

  const agency = await prisma.agency.upsert({
    where: { id: AGENCY_ID },
    update: {
      name: AGENCY_NAME,
    },
    create: {
      id: AGENCY_ID,
      name: AGENCY_NAME,
    },
  });

  const existingMembership = await prisma.membership.findFirst({
    where: {
      userId: owner.id,
      agencyId: agency.id,
    },
  });

  if (!existingMembership) {
    await prisma.membership.create({
      data: {
        userId: owner.id,
        agencyId: agency.id,
        role: Role.OWNER,
      },
    });
  } else if (existingMembership.role !== Role.OWNER) {
    await prisma.membership.update({
      where: { id: existingMembership.id },
      data: { role: Role.OWNER },
    });
  }

  const projectInputs = [
    {
      name: "Website Redesign",
      description:
        "Refresh the marketing site with new layouts, updated copy, and improved navigation.",
      dueAt: addDays(now, 14),
      status: ProjectStatus.ACTIVE,
    },
    {
      name: "Brand Assets Review",
      description:
        "Audit brand files for consistency, update logos, and deliver a clean asset kit.",
      dueAt: addDays(now, 30),
      status: ProjectStatus.ACTIVE,
    },
  ];

  const projectsByName = new Map<string, { id: string; name: string }>();

  for (const project of projectInputs) {
    const existingProject = await prisma.project.findFirst({
      where: {
        agencyId: agency.id,
        name: project.name,
      },
    });

    if (!existingProject) {
      const createdProject = await prisma.project.create({
        data: {
          agencyId: agency.id,
          name: project.name,
          description: project.description,
          status: project.status,
          dueAt: project.dueAt,
          createdByUserId: owner.id,
        },
      });
      projectsByName.set(project.name, createdProject);
      continue;
    }

    const updatedProject = await prisma.project.update({
      where: { id: existingProject.id },
      data: {
        description: project.description,
        status: project.status,
        dueAt: project.dueAt,
        createdByUserId: owner.id,
      },
    });

    projectsByName.set(project.name, updatedProject);
  }

  const client = await prisma.client.upsert({
    where: { email: CLIENT_EMAIL },
    update: {
      name: CLIENT_NAME,
    },
    create: {
      email: CLIENT_EMAIL,
      name: CLIENT_NAME,
      createdAt: now,
    },
  });

  const websiteProject = projectsByName.get("Website Redesign");
  if (!websiteProject) {
    throw new Error("Website Redesign project was not created");
  }

  await prisma.clientProjectAccess.upsert({
    where: {
      clientId_projectId: {
        clientId: client.id,
        projectId: websiteProject.id,
      },
    },
    update: {
      invitedAt: now,
      invitedByUserId: owner.id,
      revokedAt: null,
    },
    create: {
      clientId: client.id,
      projectId: websiteProject.id,
      invitedAt: now,
      invitedByUserId: owner.id,
    },
  });
}

seed()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
