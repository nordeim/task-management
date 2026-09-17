/**
 * Seed script — populates the SQLite database with the demo account that
 * mirrors the reference app's credentials, plus team members, boards,
 * groups, tasks, and activity so every surface renders with realistic data.
 *
 * Idempotent: re-running skips any user whose email already exists.
 */
import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "crypto";

const db = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(12, 0, 0, 0);
  return d;
}

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

interface SeedTask {
  title: string;
  status: string;
  priority: string;
  owner?: string;
  dueInDays?: number;
  completed?: boolean;
}

interface SeedGroup {
  name: string;
  /** Group accent color from GROUP_COLOR_OPTIONS (Add New Group palette). */
  color: string;
  tasks: SeedTask[];
}

interface SeedBoard {
  title: string;
  description: string;
  color: string;
  favorite?: boolean;
  groups: SeedGroup[];
}

const BOARDS: SeedBoard[] = [
  {
    title: "Website Redesign",
    description: "Marketing site refresh — new visual language and CMS migration",
    color: "#0073ea",
    favorite: true,
    groups: [
      {
        name: "Discovery",
        color: "#0073ea",
        tasks: [
          { title: "Stakeholder interviews", status: "done", priority: "medium", owner: "jane", dueInDays: -6, completed: true },
          { title: "Competitive analysis", status: "done", priority: "low", owner: "john", dueInDays: -4, completed: true },
          { title: "Content audit", status: "working", priority: "high", owner: "mike", dueInDays: 2 },
        ],
      },
      {
        name: "Design",
        color: "#00c875",
        tasks: [
          { title: "Wireframes for homepage", status: "done", priority: "critical", owner: "jane", dueInDays: -2, completed: true },
          { title: "Design system tokens", status: "working", priority: "high", owner: "jane", dueInDays: 3 },
          { title: "High-fidelity mockups", status: "not_started", priority: "high", owner: "jane", dueInDays: 7 },
          { title: "Mobile navigation pattern", status: "stuck", priority: "critical", owner: "mike", dueInDays: 1 },
        ],
      },
      {
        name: "Build",
        color: "#ffcb00",
        tasks: [
          { title: "Set up CMS collections", status: "not_started", priority: "medium", owner: "john", dueInDays: 10 },
          { title: "Component library scaffold", status: "not_started", priority: "high", owner: "john", dueInDays: 12 },
        ],
      },
    ],
  },
  {
    title: "Q4 Product Launch",
    description: "Launch plan for the analytics suite — GTM, enablement, and GA day",
    color: "#a25ddb",
    favorite: true,
    groups: [
      {
        name: "Go-to-market",
        color: "#0073ea",
        tasks: [
          { title: "Positioning and messaging doc", status: "done", priority: "critical", owner: "jane", dueInDays: -3, completed: true },
          { title: "Launch webinar script", status: "working", priority: "medium", owner: "jane", dueInDays: 5 },
          { title: "Pricing page update", status: "not_started", priority: "high", owner: "john", dueInDays: 8 },
        ],
      },
      {
        name: "Enablement",
        color: "#e2445c",
        tasks: [
          { title: "Sales deck refresh", status: "working", priority: "medium", owner: "mike", dueInDays: 4 },
          { title: "Support macros for new tier", status: "not_started", priority: "low", owner: "mike", dueInDays: 9 },
          { title: "Beta feedback synthesis", status: "stuck", priority: "high", dueInDays: -1 },
        ],
      },
    ],
  },
  {
    title: "Content Calendar",
    description: "Editorial calendar for blog, newsletter, and social",
    color: "#00d9ff",
    groups: [
      {
        name: "October",
        color: "#0073ea",
        tasks: [
          { title: "Newsletter #42 draft", status: "done", priority: "medium", owner: "jane", dueInDays: -1, completed: true },
          { title: "Blog: analytics benchmarks 2026", status: "working", priority: "high", owner: "jane", dueInDays: 2 },
          { title: "LinkedIn series outline", status: "not_started", priority: "low", dueInDays: 6 },
        ],
      },
      {
        name: "November",
        color: "#a25ddb",
        tasks: [
          { title: "Guest post outreach", status: "not_started", priority: "medium", owner: "mike", dueInDays: 14 },
          { title: "Year-in-review template", status: "not_started", priority: "low", dueInDays: 20 },
        ],
      },
    ],
  },
  {
    title: "Team Offsite",
    description: "Q4 offsite planning — venue, agenda, budget",
    color: "#ffcb00",
    groups: [
      {
        name: "Logistics",
        color: "#0073ea",
        tasks: [
          { title: "Book venue", status: "done", priority: "critical", owner: "john", dueInDays: -8, completed: true },
          { title: "Travel arrangements", status: "working", priority: "high", owner: "john", dueInDays: 3 },
          { title: "Dietary restrictions survey", status: "done", priority: "low", owner: "mike", dueInDays: -5, completed: true },
        ],
      },
      {
        name: "Agenda",
        color: "#00c875",
        tasks: [
          { title: "Day 1 workshop topics", status: "working", priority: "medium", owner: "jane", dueInDays: 5 },
          { title: "Team dinner reservation", status: "not_started", priority: "low", dueInDays: 11 },
        ],
      },
    ],
  },
];

async function main() {
  const demo = await db.user.upsert({
    where: { email: "sepnetflix2023@outlook.com" },
    // update: keep role/presence converged on re-runs against older seeds.
    update: { role: "Owner", online: true },
    create: {
      email: "sepnetflix2023@outlook.com",
      // Named after the email prefix so the demo greets exactly like the
      // reference account ("Good morning, sepnetflix2023!").
      name: "sepnetflix2023",
      passwordHash: hashPassword("Abcd1234"),
      avatarColor: "#00d9ff",
      // Mock team metadata: the account owns every seeded board.
      role: "Owner",
      online: true,
    },
  });

  // Roles/presence mirror the reference's hardcoded team mix (one Owner,
  // two Editors, one Viewer; three of four "online") so the board header's
  // three visible avatars show blue/green/purple with dots on the first two.
  const teammateData = [
    { email: "jane.doe@example.com", name: "Jane Doe", avatarColor: "#0073ea", role: "Editor", online: true },
    { email: "john.smith@example.com", name: "John Smith", avatarColor: "#a25ddb", role: "Editor", online: true },
    { email: "mike.jones@example.com", name: "Mike Jones", avatarColor: "#fdab3d", role: "Viewer", online: false },
  ];
  const teammates = new Map<string, string>();
  for (const t of teammateData) {
    const row = await db.user.upsert({
      where: { email: t.email },
      update: { role: t.role, online: t.online },
      create: {
        ...t,
        // Teammates never log in — random hash makes the account unusable.
        passwordHash: hashPassword(randomBytes(24).toString("hex")),
      },
    });
    teammates.set(t.name.split(" ")[0].toLowerCase(), row.id);
  }

  const existingBoards = await db.board.count({ where: { ownerId: demo.id } });
  if (existingBoards > 0) {
    console.log(`Seed: demo user already has ${existingBoards} boards — skipping board creation.`);
    return;
  }

  for (const seedBoard of BOARDS) {
    const board = await db.board.create({
      data: {
        title: seedBoard.title,
        description: seedBoard.description,
        color: seedBoard.color,
        visibility: "private",
        isFavorite: seedBoard.favorite ?? false,
        ownerId: demo.id,
      },
    });

    for (const [groupIndex, seedGroup] of seedBoard.groups.entries()) {
      const group = await db.group.create({
        data: { name: seedGroup.name, boardId: board.id, position: groupIndex, color: seedGroup.color },
      });

      for (const [taskIndex, seedTask] of seedGroup.tasks.entries()) {
        await db.task.create({
          data: {
            title: seedTask.title,
            status: seedTask.status,
            priority: seedTask.priority,
            groupId: group.id,
            boardId: board.id,
            ownerId: seedTask.owner ? teammates.get(seedTask.owner) ?? null : null,
            dueDate: seedTask.dueInDays !== undefined ? daysFromNow(seedTask.dueInDays) : null,
            completed: seedTask.completed ?? false,
            position: taskIndex,
          },
        });
      }
    }

    await db.activity.create({
      data: {
        userId: demo.id,
        type: "board_created",
        message: `created board "${board.title}"`,
        boardId: board.id,
        createdAt: hoursAgo(72),
      },
    });
  }

  // A richer activity feed than just board creations.
  const activityFeed = [
    { type: "task_completed", message: 'completed task "Wireframes for homepage" in "Website Redesign"', hours: 3 },
    { type: "task_created", message: 'added task "Pricing page update" to "Q4 Product Launch"', hours: 7 },
    { type: "task_completed", message: 'completed task "Newsletter #42 draft" in "Content Calendar"', hours: 26 },
    { type: "task_created", message: 'added task "Mobile navigation pattern" to "Website Redesign"', hours: 30 },
    { type: "group_created", message: 'added group "Build" to "Website Redesign"', hours: 48 },
    { type: "task_completed", message: 'completed task "Book venue" in "Team Offsite"', hours: 50 },
    { type: "task_created", message: 'added task "Beta feedback synthesis" to "Q4 Product Launch"', hours: 55 },
  ];
  for (const entry of activityFeed) {
    await db.activity.create({
      data: {
        userId: demo.id,
        type: entry.type,
        message: entry.message,
        createdAt: hoursAgo(entry.hours),
      },
    });
  }

  const counts = {
    boards: await db.board.count({ where: { ownerId: demo.id } }),
    groups: await db.group.count(),
    tasks: await db.task.count(),
    users: await db.user.count(),
  };
  console.log("Seed complete:", counts);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
