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
    // Verify caller is an admin
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr || !isAdmin) {
      throw new Error("Forbidden: admin access required");
    }

    // Create user via admin API (auto-confirmed so they can sign in immediately)
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

    // The handle_new_user trigger inserts a default 'customer' role.
    // Replace with the admin-selected role set.
    await supabaseAdmin.from("user_roles").delete().eq("user_id", newUserId);
    const rows = data.roles.map((role) => ({ user_id: newUserId, role }));
    const { error: insErr } = await supabaseAdmin.from("user_roles").insert(rows);
    if (insErr) throw new Error(insErr.message);

    return { id: newUserId, email: data.email };
  });
