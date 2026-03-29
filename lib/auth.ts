import { supabase } from "./supabase";
import type { Business } from "./types";

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  return { data, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error };
}

export async function getBusinessForOwner(
  ownerId: string
): Promise<Business | null> {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("owner_id", ownerId)
    .single();

  if (error || !data) return null;
  return data as Business;
}

export async function createBusiness(
  ownerId: string,
  details: {
    name: string;
    slug: string;
    brand_color: string;
    reward_stamps_needed: number;
    reward_description: string;
    staff_pin: string;
  }
): Promise<{ business: Business | null; error: string | null }> {
  const { data, error } = await supabase
    .from("businesses")
    .insert({
      owner_id: ownerId,
      ...details,
    })
    .select()
    .single();

  if (error) return { business: null, error: error.message };
  return { business: data as Business, error: null };
}

export async function updateBusiness(
  businessId: string,
  updates: Partial<Business>
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("businesses")
    .update(updates)
    .eq("id", businessId);

  if (error) return { error: error.message };
  return { error: null };
}

// Generate a URL-friendly slug from business name
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 40);
}

// Generate a random 4-digit staff PIN
export function generateStaffPin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}
