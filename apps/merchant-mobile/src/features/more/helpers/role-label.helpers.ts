export function roleLabel(role?: string | null): string {
  switch (role) {
    case "restaurant_owner":
      return "Owner";
    case "manager":
      return "Manager";
    case "host":
      return "Host";
    case "admin":
      return "Admin";
    default:
      return role ?? "Partner";
  }
}
