import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center p-8">
        <h2 className="text-lg font-semibold text-gray-900">Error de autenticación</h2>
        <p className="mt-2 text-sm text-gray-500">
          El enlace ha expirado o no es válido.
        </p>
        <Link
          href="/auth/login"
          className="mt-4 inline-block text-sm text-blue-600 hover:underline"
        >
          Volver al login
        </Link>
      </div>
    </div>
  );
}
