"use server";

import { redirect } from "next/navigation";
import { notificationContent, validationContent } from "@/content";
import { getSiteUrl, isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "./types";

export type AuthActionState = {
  message: string;
  status: "idle" | "error" | "success";
};

const roleDestinations: Record<UserRole, string> = {
  editor: "/editörler",
  publisher: "/yayinevi",
  reader: "/kitap/kayip-sehir",
  writer: "/yazar",
};

const roles: UserRole[] = ["reader", "writer", "editor", "publisher"];
const standardRoles: UserRole[] = ["reader", "writer"];

function error(message: string): AuthActionState {
  return { message, status: "error" };
}

function success(message: string): AuthActionState {
  return { message, status: "success" };
}

function configured() {
  return isSupabaseConfigured() ? null : error(validationContent.serviceNotConfigured);
}

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function safeNextPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : null;
}

function authMessage(message: string) {
  const normalized = message.toLocaleLowerCase("en");
  if (normalized.includes("invalid login")) return validationContent.invalidCredentials;
  if (normalized.includes("email not confirmed")) return validationContent.emailNotConfirmed;
  if (normalized.includes("already registered")) return validationContent.emailAlreadyRegistered;
  if (normalized.includes("password")) return validationContent.invalidPassword;
  if (normalized.includes("rate limit")) return validationContent.rateLimited;
  return validationContent.genericFailure;
}

function validPassword(password: string) {
  return password.length >= 8 && /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(password) && /\d/.test(password);
}

export async function loginAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const configurationError = configured();
  if (configurationError) return configurationError;

  const email = getText(formData, "email");
  const password = getText(formData, "password");
  if (!email || !password) return error(validationContent.requiredCredentials);

  const supabase = await createClient();
  const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
  if (signInError) return error(authMessage(signInError.message));

  const { data: profile, error: profileError } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (profileError || !profile || !roles.includes(profile.role as UserRole)) {
    await supabase.auth.signOut();
    return error(validationContent.profileUnavailable);
  }
  const role = profile.role as UserRole;
  const requestedPath = safeNextPath(getText(formData, "next"));
  redirect(requestedPath ?? roleDestinations[role]);
}

export async function registerAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const configurationError = configured();
  if (configurationError) return configurationError;

  const fullName = getText(formData, "full-name");
  const email = getText(formData, "email");
  const password = getText(formData, "password");
  const confirmation = getText(formData, "password-confirmation");
  if (fullName.length < 2) return error(validationContent.fullNameRequired);
  if (!/^\S+@\S+\.\S+$/.test(email)) return error(validationContent.invalidEmail);
  if (!validPassword(password)) return error(validationContent.invalidPassword);
  if (password !== confirmation) return error(validationContent.passwordsDoNotMatch);

  const supabase = await createClient();
  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    options: {
      data: { avatar_url: null, full_name: fullName },
      emailRedirectTo: `${getSiteUrl()}/auth/confirm?next=/rol-secimi`,
    },
    password,
  });
  if (signUpError) return error(authMessage(signUpError.message));
  if (data.session) redirect("/rol-secimi");
  return success(notificationContent.verificationSent);
}

export async function resetPasswordAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const configurationError = configured();
  if (configurationError) return configurationError;

  const email = getText(formData, "email");
  if (!/^\S+@\S+\.\S+$/.test(email)) return error(validationContent.invalidEmail);
  const supabase = await createClient();
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/confirm?next=/sifre-yenile`,
  });
  if (resetError) return error(authMessage(resetError.message));
  return success(notificationContent.passwordResetSent);
}

export async function updatePasswordAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const configurationError = configured();
  if (configurationError) return configurationError;
  const password = getText(formData, "password");
  const confirmation = getText(formData, "password-confirmation");
  if (!validPassword(password)) return error(validationContent.invalidPassword);
  if (password !== confirmation) return error(validationContent.passwordsDoNotMatch);

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims) return error(validationContent.expiredResetLink);
  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) return error(authMessage(updateError.message));
  await supabase.auth.signOut();
  redirect("/giris?durum=sifre-guncellendi");
}

export async function updateRoleAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const configurationError = configured();
  if (configurationError) return configurationError;
  const role = getText(formData, "role") as UserRole;
  if (!roles.includes(role)) return error(validationContent.invalidRole);

  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) redirect("/giris?sonraki=/rol-secimi");

  if (standardRoles.includes(role)) {
    const { error: roleError } = await supabase.rpc("set_standard_role", { selected_role: role });
    if (roleError) return error(validationContent.roleSaveFailed);
    redirect(roleDestinations[role]);
  }

  const { error: requestError } = await supabase.rpc("request_privileged_role", { requested: role });
  if (requestError) return error(validationContent.roleRequestFailed);

  return success(
    role === "editor"
      ? notificationContent.editorRoleRequested
      : notificationContent.publisherRoleRequested,
  );
}

export async function logoutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/giris");
}
