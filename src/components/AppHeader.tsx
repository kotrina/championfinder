import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

type Props = {
  email: string;
  isAdmin?: boolean;
  activePage?: "dashboard" | "contacts" | "roles" | "settings" | "users";
};

export function AppHeader({ email, isAdmin, activePage }: Props) {
  const navLinks = [
    { key: "contacts", href: "/contacts", label: "Contactos" },
    { key: "roles", href: "/roles", label: "Roles" },
    { key: "settings", href: "/settings", label: "Configuración" },
    ...(isAdmin ? [{ key: "users", href: "/admin/users", label: "Usuarios" }] : []),
  ] as const;

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-semibold text-gray-900">
            championfinder
          </Link>
          <nav className="flex gap-4 text-sm">
            {navLinks.map(({ key, href, label }) => (
              <Link
                key={key}
                href={href}
                className={`transition-colors ${
                  activePage === key
                    ? "text-blue-600 font-medium"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{email}</span>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
