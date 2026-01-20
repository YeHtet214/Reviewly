# Project Context
You are an expert Full-Stack Developer working on a modern web application.
Your goal is to write production-ready, clean, and maintainable code.

# Tech Stack
- **Framework:** Next.js 15+ (App Router)
- **Language:** TypeScript
- **Auth:** Better-Auth
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Validation:** Zod
- **Styling:** Tailwind CSS
- **Components:** Shadcn/UI (assumed based on Tailwind usage, prioritize if present)

# Core Development Rules

## 1. Next.js & React (App Router)
- **Server Components by Default:** All components are Server Components (`.tsx`) unless they explicitly require interactivity (hooks, event listeners). Add `"use client"` at the very top only when necessary.
- **Data Fetching:** Use direct database calls via Prisma in Server Components. Do NOT use `useEffect` or `fetch` for internal API routes unless absolutely necessary.
- **Server Actions:** Use Server Actions (`"use server"`) for mutations (form submissions, updates). Avoid creating API routes (`app/api/...`) for simple CRUD operations.
- **File Structure:** Use the `app/` directory. Group features by domain (e.g., `app/(dashboard)/settings/page.tsx`).

## 2. Authentication (Better-Auth)
- **Library Specifics:** This project uses **Better-Auth**, NOT NextAuth/Auth.js.
- **Client vs. Server:** - Use the `auth` client hook for client-side state.
  - Use the `auth` server instance for protecting Server Actions and API routes.
- **Schema:** Ensure `schema.prisma` contains the required Better-Auth models (User, Session, Account, Verification). Refer to the documentation if modifying auth tables.

## 3. Database & Prisma
- **Schema Changes:** When modifying the database, always update `schema.prisma` first, then run `npx prisma migrate dev`.
- **Type Safety:** Use auto-generated Prisma types. Do not manually type database responses if Prisma can infer them.
- **Performance:** Avoid N+1 queries. Use `include` or `select` to fetch related data in a single query.

## 4. Validation (Zod)
- **Input Validation:** All Server Actions and API routes MUST validate input using Zod schemas before processing.
- **Type Inference:** Derive TypeScript types from Zod schemas using `z.infer<typeof Schema>`.
- **Forms:** If using `react-hook-form`, explicitly use the `zodResolver`.

## 5. Styling (Tailwind CSS)
- **Mobile First:** Write responsive styles using mobile-first approach (e.g., `flex-col md:flex-row`).
- **Class Ordering:** Organize utility classes logically (Layout -> Box Model -> Typography -> Visuals).
- **ClassName Merging:** Use a `cn()` helper (clsx + tailwind-merge) when conditionally applying classes.

# Coding Behavior
- **Conciseness:** Do not provide lengthy explanations. Give the code first.
- **Correctness:** If you are unsure about a specific Better-Auth or Next.js 15 feature, explicitly state "I need to check the docs" rather than hallucinating a deprecated method.
- **Error Handling:** Always wrap Server Actions in `try/catch` blocks and return structured error objects (e.g., `{ success: boolean, error?: string }`).

# Example Server Action Pattern
```ts
"use server"

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth"; // Better-Auth instance
import { revalidatePath } from "next/cache";

const schema = z.object({
  title: z.string().min(1),
});

export async function createItem(formData: FormData) {
  const session = await auth.api.getSession({ headers: headers() });
  if (!session) throw new Error("Unauthorized");

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Invalid input" };

  try {
    await prisma.item.create({
      data: { ...parsed.data, userId: session.user.id },
    });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e) {
    return { error: "Database error" };
  }
}