import "server-only";
import { cache } from "react";
import { getAuthContext } from "@/lib/auth";
import type { Membership, Team, TeamMember } from "@/lib/models";

export const getMembership = cache(async () => {
  const { supabase, user } = await getAuthContext();
  const { data, error } = await supabase
    .from("team_members")
    .select("team_id, user_id, role")
    .eq("user_id", user.id)
    .returns<Membership[]>()
    .maybeSingle();
  if (error) throw new Error("MEMBERSHIP_UNAVAILABLE");
  return data;
});

export async function getTeam(teamId: string): Promise<Team> {
  const { supabase } = await getAuthContext();
  const { data, error } = await supabase
    .from("teams")
    .select("id, name, join_code, created_by")
    .eq("id", teamId)
    .returns<Team[]>()
    .single();
  if (error || !data) throw new Error("TEAM_UNAVAILABLE");
  return data;
}

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  const { supabase } = await getAuthContext();
  const { data, error } = await supabase
    .from("team_members")
    .select("team_id, user_id, role, profile:profiles!team_members_user_id_fkey(id, display_name)")
    .eq("team_id", teamId)
    .order("joined_at")
    .returns<TeamMember[]>();
  if (error || !data) throw new Error("TEAM_MEMBERS_UNAVAILABLE");
  if (data.some((member) => !member.profile)) throw new Error("TEAM_PROFILE_UNAVAILABLE");
  return data;
}
