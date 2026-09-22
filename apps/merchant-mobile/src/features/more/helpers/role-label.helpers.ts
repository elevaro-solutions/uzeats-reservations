export function roleLabel(role?: string | null): string {
  switch (role) {
    case "restaurant_owner":
      return "Owner";
    case "staff":
      return "Staff";
    case "admin":
      return "Admin";
    default:
      return role ?? "Partner";
  }
}
