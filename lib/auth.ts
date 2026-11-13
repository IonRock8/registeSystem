import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import type { Profile } from "@/lib/models";

export const getAuthContext = cache(async () => {
  if (!hasSupabaseEnv) redirect("/login");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return { supabase, user: data.user };
});

export const getCurrentProfile = cache(async () => {
  const { supabase, user } = await getAuthContext();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("id", user.id)
    .returns<Profile[]>()
    .single();
  if (error || !data) throw new Error("PROFILE_UNAVAILABLE");
  return data;
});
