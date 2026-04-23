import Organization from "@/models/Organization";

function buildDefaultOrganizationName(user) {
  const normalizedName = user?.name?.trim();
  if (normalizedName) return `${normalizedName} - Negocio`;

  const email = user?.email?.trim().toLowerCase() || "";
  const [localPart] = email.split("@");
  if (localPart) return `${localPart} - Negocio`;

  return "Mi Negocio";
}

export async function ensureUserOrganization(user) {
  if (!user) return null;

  if (user.organizationId) {
    return user.organizationId.toString();
  }

  const organization = await Organization.create({
    name: buildDefaultOrganizationName(user),
    ownerUserId: user._id,
  });

  user.organizationId = organization._id;
  if (!user.role) {
    user.role = "owner";
  }
  await user.save();

  return organization._id.toString();
}
