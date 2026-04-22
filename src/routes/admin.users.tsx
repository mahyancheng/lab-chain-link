import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PortalShell } from "@/components/PortalShell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { RoleGuard } from "@/components/RoleGuard";
import { Search, Users, UserPlus } from "lucide-react";
import { adminCreateUser } from "@/server/admin-users";

export const Route = createFileRoute("/admin/users")({
  component: () => (
    <RoleGuard allow={["admin"]}>
      <AdminUsers />
    </RoleGuard>
  ),
});

const NAV = [
  { to: "/admin", label: "Operations" },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/finance", label: "Finance" },
  { to: "/admin/config", label: "Configuration" },
];

type Role = "customer" | "lab" | "admin";
const ALL_ROLES: Role[] = ["customer", "lab", "admin"];

interface UserRow {
  id: string;
  full_name: string | null;
  company: string | null;
  phone: string | null;
  created_at: string;
  roles: Role[];
}

function AdminUsers() {
  const { user: me } = useAuth();
  const [rows, setRows] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const [profilesRes, rolesRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, company, phone, created_at")
        .order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]);
    const rolesByUser = new Map<string, Role[]>();
    (rolesRes.data ?? []).forEach((r) => {
      const list = rolesByUser.get(r.user_id) ?? [];
      list.push(r.role as Role);
      rolesByUser.set(r.user_id, list);
    });
    const merged: UserRow[] = (profilesRes.data ?? []).map((p) => ({
      id: p.id,
      full_name: p.full_name,
      company: p.company,
      phone: p.phone,
      created_at: p.created_at,
      roles: rolesByUser.get(p.id) ?? [],
    }));
    setRows(merged);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (r) =>
        (r.full_name ?? "").toLowerCase().includes(term) ||
        (r.company ?? "").toLowerCase().includes(term) ||
        (r.phone ?? "").toLowerCase().includes(term) ||
        r.roles.some((role) => role.includes(term)),
    );
  }, [rows, q]);

  async function toggleRole(userId: string, role: Role, currentlyHas: boolean) {
    if (!me) return;
    if (userId === me.id && role === "admin" && currentlyHas) {
      toast.error("You cannot remove your own admin role");
      return;
    }
    setSavingId(userId);
    if (currentlyHas) {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
      if (error) {
        toast.error(error.message);
        setSavingId(null);
        return;
      }
    } else {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });
      if (error) {
        toast.error(error.message);
        setSavingId(null);
        return;
      }
    }
    setRows((prev) =>
      prev.map((r) =>
        r.id === userId
          ? {
              ...r,
              roles: currentlyHas
                ? r.roles.filter((x) => x !== role)
                : [...r.roles, role],
            }
          : r,
      ),
    );
    setSavingId(null);
    toast.success("Role updated");
  }

  const stats = useMemo(() => {
    const s = { total: rows.length, customer: 0, lab: 0, admin: 0 };
    rows.forEach((r) => r.roles.forEach((role) => (s[role] += 1)));
    return s;
  }, [rows]);

  return (
    <PortalShell title="Admin Portal" nav={NAV} requireRole="admin">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users & Roles</h1>
          <p className="text-sm text-muted-foreground">
            Manage who can access the customer portal, lab workspace, and admin
            tools.
          </p>
        </div>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> Total accounts
          </div>
          <div className="mt-1 text-2xl font-bold">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Customers</div>
          <div className="mt-1 text-2xl font-bold">{stats.customer}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Lab staff</div>
          <div className="mt-1 text-2xl font-bold">{stats.lab}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">Admins</div>
          <div className="mt-1 text-2xl font-bold">{stats.admin}</div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, company, phone, role…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-8"
            />
          </div>
          <div className="text-xs text-muted-foreground">
            {filtered.length} of {rows.length}
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Current roles</TableHead>
                {ALL_ROLES.map((r) => (
                  <TableHead key={r} className="text-center capitalize">
                    {r}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((u) => {
                  const isMe = me?.id === u.id;
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {u.full_name ?? "—"}
                        {isMe && (
                          <Badge variant="secondary" className="ml-2 text-[10px]">
                            you
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.company ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.phone ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(u.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {u.roles.length === 0 ? (
                            <span className="text-xs text-muted-foreground">
                              none
                            </span>
                          ) : (
                            u.roles.map((r) => (
                              <Badge
                                key={r}
                                variant={r === "admin" ? "default" : "secondary"}
                                className="capitalize"
                              >
                                {r}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      {ALL_ROLES.map((role) => {
                        const has = u.roles.includes(role);
                        const disableSelf =
                          isMe && role === "admin" && has;
                        return (
                          <TableCell key={role} className="text-center">
                            <Checkbox
                              checked={has}
                              disabled={savingId === u.id || disableSelf}
                              onCheckedChange={() =>
                                toggleRole(u.id, role, has)
                              }
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          New signups receive the <strong>customer</strong> role by default.
          Toggle <strong>lab</strong> to grant access to the lab workspace, or{" "}
          <strong>admin</strong> to grant full administrative access.
        </p>
      </Card>
    </PortalShell>
  );
}
