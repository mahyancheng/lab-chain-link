import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Role = "customer" | "lab" | "admin";

interface CreateUserInput {
  email: string;
  password: string;
  full_name?: string;
  company?: string;
  phone?: string;
  roles: Role[];
}

async function assertCallerIsAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (roleErr || !isAdmin) throw new Error("Forbidden: admin access required");
}

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: CreateUserInput) => {
    if (!input?.email || !input?.password) throw new Error("Email and password are required");
    if (input.password.length < 6) throw new Error("Password must be at least 6 characters");
    const allowed: Role[] = ["customer", "lab", "admin"];
    const roles = (input.roles ?? []).filter((r) => allowed.includes(r));
    return {
      email: String(input.email).trim().toLowerCase(),
      password: String(input.password),
      full_name: input.full_name ? String(input.full_name) : undefined,
      company: input.company ? String(input.company) : undefined,
      phone: input.phone ? String(input.phone) : undefined,
      roles: roles.length ? roles : (["customer"] as Role[]),
    };
  })
  .handler(async ({ data, context }) => {
    await assertCallerIsAdmin(context);

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name ?? "",
        company: data.company ?? "",
        phone: data.phone ?? "",
      },
    });
    if (createErr || !created.user) {
      throw new Error(createErr?.message ?? "Failed to create user");
    }
    const newUserId = created.user.id;

    await supabaseAdmin.from("user_roles").delete().eq("user_id", newUserId);
    const rows = data.roles.map((role) => ({ user_id: newUserId, role }));
    const { error: insErr } = await supabaseAdmin.from("user_roles").insert(rows);
    if (insErr) throw new Error(insErr.message);

    return { id: newUserId, email: data.email };
  });

export const adminResetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { user_id: string; new_password: string }) => {
    if (!input?.user_id) throw new Error("user_id required");
    if (!input?.new_password || input.new_password.length < 6) {
      throw new Error("Password must be at least 6 characters");
    }
    return { user_id: String(input.user_id), new_password: String(input.new_password) };
  })
  .handler(async ({ data, context }) => {
    await assertCallerIsAdmin(context);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.new_password,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetUserBanned = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { user_id: string; banned: boolean }) => {
    if (!input?.user_id) throw new Error("user_id required");
    return { user_id: String(input.user_id), banned: !!input.banned };
  })
  .handler(async ({ data, context }) => {
    await assertCallerIsAdmin(context);
    if (data.user_id === context.userId && data.banned) {
      throw new Error("You cannot disable your own account");
    }
    // ban_duration: "876000h" (~100y) disables sign-in; "none" re-enables it.
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      ban_duration: data.banned ? "876000h" : "none",
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true, banned: data.banned };
  });

export const adminListUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertCallerIsAdmin(context);
    // page through users (assumes < a few hundred for now)
    const map: Record<string, { banned: boolean; email: string | null }> = {};
    let page = 1;
    const perPage = 200;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
      if (error) throw new Error(error.message);
      for (const u of data.users) {
        const banned_until = (u as any).banned_until as string | null | undefined;
        const banned = !!banned_until && new Date(banned_until).getTime() > Date.now();
        map[u.id] = { banned, email: u.email ?? null };
      }
      if (data.users.length < perPage) break;
      page += 1;
      if (page > 20) break; // safety
    }
    return { users: map };
  });
