import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Mail,
  Copy,
  Check,
  UserPlus,
  Loader2Icon,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryClient";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface Invite {
  id: string;
  email: string;
  status: "pending" | "accepted" | "declined";
  createdAt: Timestamp;
  expiresAt: Timestamp;
}

export default function StableInvitePage() {
  const { stableId } = useParams<{ stableId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"manager" | "member">(
    "member",
  );

  // Fetch stable info
  const { data: stableName = "" } = useQuery({
    queryKey: queryKeys.stables.detail(stableId || ""),
    queryFn: async () => {
      if (!stableId) return "";
      const stableDoc = await getDoc(doc(db, "stables", stableId));
      if (stableDoc.exists()) {
        return stableDoc.data().name || "Unnamed Stable";
      }
      return "";
    },
    enabled: !!user && !!stableId,
    staleTime: 10 * 60 * 1000,
  });

  // Fetch invites
  const { data: invites = [], isLoading: loading } = useQuery({
    queryKey: ["invites", "stable", stableId],
    queryFn: async () => {
      if (!user || !stableId) return [];

      const invitesQuery = query(
        collection(db, "invites"),
        where("stableId", "==", stableId),
      );
      const invitesSnapshot = await getDocs(invitesQuery);
      return invitesSnapshot.docs.map(
        (doc) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as Invite,
      );
    },
    enabled: !!user && !!stableId,
    staleTime: 2 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !stableId || !inviteEmail.trim()) return;

    try {
      setInviting(true);

      // Validate required fields
      if (!stableName) {
        throw new Error("Stable name is required");
      }
      if (!selectedRole) {
        throw new Error("Please select a role");
      }

      // Create invite
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      await addDoc(collection(db, "invites"), {
        stableId,
        stableName, // ✅ ADDED - from existing state
        email: inviteEmail.trim(),
        role: selectedRole, // ✅ ADDED - from new state
        status: "pending",
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(expiresAt),
        invitedBy: user.uid,
        invitedByEmail: user.email,
        invitedByName: user.fullName, // Uses computed fullName from firstName/lastName with fallbacks
      });

      // Reload invites
      queryClient.invalidateQueries({
        queryKey: ["invites", "stable", stableId],
      });
      setInviteEmail("");
    } catch (error) {
      console.error("Error sending invite:", error);
    } finally {
      setInviting(false);
    }
  };

  const handleCopyInviteLink = () => {
    const inviteLink = `${window.location.origin}/invite/${stableId}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "bg-green-100 text-green-800";
      case "declined":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <Link to={`/stables/${stableId}`}>
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Stable
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Invite Members</h1>
        <p className="text-muted-foreground mt-1">
          Invite people to join {stableName}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Invite Form */}
        <Card>
          <CardHeader>
            <CardTitle>Send Email Invite</CardTitle>
            <CardDescription>
              Enter an email address to send an invitation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="member@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="member"
                      checked={selectedRole === "member"}
                      onChange={() => setSelectedRole("member")}
                      className="cursor-pointer"
                    />
                    <span className="font-medium">Member</span>
                    <span className="text-xs text-muted-foreground">
                      Can view and book shifts
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="manager"
                      checked={selectedRole === "manager"}
                      onChange={() => setSelectedRole("manager")}
                      className="cursor-pointer"
                    />
                    <span className="font-medium">Manager</span>
                    <span className="text-xs text-muted-foreground">
                      Can create schedules and invite members
                    </span>
                  </label>
                </div>
              </div>

              <Button type="submit" disabled={inviting} className="w-full">
                {inviting ? (
                  <>
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Invite
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Invite Link */}
        <Card>
          <CardHeader>
            <CardTitle>Invite Link</CardTitle>
            <CardDescription>
              Share this link with people you want to invite
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={`${window.location.origin}/invite/${stableId}`}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyInviteLink}
              >
                {copiedLink ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Anyone with this link can request to join this stable
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Invites */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Invites</CardTitle>
          <CardDescription>
            Invitations sent to join this stable
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invites.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No invites sent yet</p>
              <p className="text-sm">Send your first invitation above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <p className="font-medium">{invite.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Sent {invite.createdAt.toDate().toLocaleDateString()}
                    </p>
                  </div>
                  <Badge className={getStatusColor(invite.status)}>
                    {invite.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
