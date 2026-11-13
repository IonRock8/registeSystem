export type Profile = { id: string; display_name: string };
export type Membership = { team_id: string; user_id: string; role: "lead" | "member" };
export type Team = { id: string; name: string; join_code: string; created_by: string };
export type TeamMember = Membership & { profile: Profile | null };
export type TaskStatus = "todo" | "doing" | "done";
export type Task = {
  id: string;
  title: string;
  detail: string | null;
  due_date: string | null;
  status: TaskStatus;
  assignee_id: string;
  created_at: string;
  assignee: Profile | null;
};
export type FormState = {
  error?: string;
  success?: string;
  fieldErrors?: Partial<Record<string, string>>;
  values?: Record<string, string>;
};
