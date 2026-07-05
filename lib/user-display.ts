/** Display initials for avatar circles */
export function getUserInitials(name?: string | null, username?: string | null): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return parts[0].slice(0, 2).toUpperCase();
  }
  if (username?.trim()) {
    return username.trim().slice(0, 2).toUpperCase();
  }
  return "?";
}

export function getUserDisplayName(
  name?: string | null,
  username?: string | null,
  email?: string | null,
): string {
  if (name?.trim()) return name.trim();
  if (username?.trim()) return username.trim();
  if (email?.trim()) return email.split("@")[0];
  return "Your account";
}
