import { SplitText } from "@/components/ui/split-text";
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
import { Search, Users, UserPlus, KeyRound, Ban, CircleCheck, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  adminCreateUser,
  adminResetPassword,
  adminSetUserBanned,
  adminListUserStatus,
} from "@/server/admin-users";

export const Route = createFileRoute("/admin/users")({
  component: () => (
    <RoleGuard allow={["admin"]}>
      <AdminUsers />
    </RoleGuard>
  ),
});

const NAV = [
  { to: "/admin", label: "Operations" },
  { to: "/admin/customers", label: "Customers" },
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
  const [authStatus, setAuthStatus] = useState<Record<string, { banned: boolean; email: string | null }>>({});
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newRoles, setNewRoles] = useState<Role[]>(["customer"]);
  const [pwTarget, setPwTarget] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  async function authedToken() {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) throw new Error("Not authenticated");
    return token;
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setCreating(true);
    try {
      const token = await authedToken();
      await adminCreateUser({
        data: {
          email: String(fd.get("email") ?? ""),
          password: String(fd.get("password") ?? ""),
          full_name: String(fd.get("full_name") ?? ""),
          company: String(fd.get("company") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          roles: newRoles,
        },
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Account created");
      setCreateOpen(false);
      setNewRoles(["customer"]);
      await load();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create account");
    } finally {
      setCreating(false);
    }
  }

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

    // Fetch ban status (admin-only server fn)
    try {
      const token = await authedToken();
      const res = await adminListUserStatus({ headers: { Authorization: `Bearer ${token}` } });
      setAuthStatus(res.users ?? {});
    } catch (err) {
      // non-fatal
      console.warn("Could not load auth status", err);
    }
  }

  async function handleResetPassword() {
    if (!pwTarget) return;
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setPwSaving(true);
    try {
      const token = await authedToken();
      await adminResetPassword({
        data: { user_id: pwTarget.id, new_password: newPassword },
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(`Password updated for ${pwTarget.full_name ?? "user"}`);
      setPwTarget(null);
      setNewPassword("");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update password");
    } finally {
      setPwSaving(false);
    }
  }

  async function toggleBanned(target: UserRow, banned: boolean) {
    if (target.id === me?.id && banned) {
      toast.error("You cannot disable your own account");
      return;
    }
    setSavingId(target.id);
    try {
      const token = await authedToken();
      await adminSetUserBanned({
        data: { user_id: target.id, banned },
        headers: { Authorization: `Bearer ${token}` },
      });
      setAuthStatus((prev) => ({
        ...prev,
        [target.id]: { ...(prev[target.id] ?? { email: null }), banned },
      }));
      toast.success(banned ? "Account disabled" : "Account re-enabled");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update account");
    } finally {
      setSavingId(null);
    }
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
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold"><SplitText>Users & Roles</SplitText></h1>
          <p className="text-sm text-muted-foreground">
            Manage who can access the customer portal, lab workspace, and admin
            tools.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              New account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create account</DialogTitle>
              <DialogDescription>
                The user will be able to sign in immediately with the email and
                password you set.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="full_name">Full name</Label>
                  <Input id="full_name" name="full_name" required />
                </div>
                <div>
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" name="company" />
                </div>
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  minLength={6}
                  required
                />
              </div>
              <div>
                <Label className="mb-2 block">Roles</Label>
                <div className="flex flex-wrap gap-3">
                  {ALL_ROLES.map((r) => {
                    const checked = newRoles.includes(r);
                    return (
                      <label
                        key={r}
                        className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm capitalize"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) =>
                            setNewRoles((prev) =>
                              v
                                ? Array.from(new Set([...prev, r]))
                                : prev.filter((x) => x !== r),
                            )
                          }
                        />
                        {r}
                      </label>
                    );
                  })}
                </div>
                {newRoles.length === 0 && (
                  <p className="mt-1 text-xs text-destructive">
                    Select at least one role.
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCreateOpen(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={creating || newRoles.length === 0}
                >
                  {creating ? "Creating…" : "Create account"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
                <TableHead>Status</TableHead>
                <TableHead>Current roles</TableHead>
                {ALL_ROLES.map((r) => (
                  <TableHead key={r} className="text-center capitalize">
                    {r}
                  </TableHead>
                ))}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
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
                        {authStatus[u.id]?.banned ? (
                          <Badge variant="destructive">Disabled</Badge>
                        ) : (
                          <Badge variant="outline">Active</Badge>
                        )}
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
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={savingId === u.id}
                              aria-label="Account actions"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setNewPassword("");
                                setPwTarget(u);
                              }}
                            >
                              <KeyRound className="mr-2 h-4 w-4" />
                              Change password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {authStatus[u.id]?.banned ? (
                              <DropdownMenuItem
                                onClick={() => toggleBanned(u, false)}
                              >
                                <CircleCheck className="mr-2 h-4 w-4" />
                                Re-enable account
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                disabled={isMe}
                                onClick={() => {
                                  if (
                                    confirm(
                                      `Disable sign-in for ${u.full_name ?? "this user"}? Their data is preserved and they can be re-enabled later.`,
                                    )
                                  ) {
                                    toggleBanned(u, true);
                                  }
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Ban className="mr-2 h-4 w-4" />
                                Disable account
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
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

      <Dialog
        open={!!pwTarget}
        onOpenChange={(o) => {
          if (!o) {
            setPwTarget(null);
            setNewPassword("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>
              Set a new password for{" "}
              <strong>{pwTarget?.full_name ?? "this user"}</strong>. They will be
              able to sign in with the new password immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="new_password">New password</Label>
              <Input
                id="new_password"
                type="password"
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setPwTarget(null);
                setNewPassword("");
              }}
              disabled={pwSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={pwSaving || newPassword.length < 6}
            >
              {pwSaving ? "Updating…" : "Update password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PortalShell>
  );
}
