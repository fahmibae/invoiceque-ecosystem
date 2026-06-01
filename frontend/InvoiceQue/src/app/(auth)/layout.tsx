import AuthLanguageSwitcher from "@/components/ui/AuthLanguageSwitcher";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="fixed left-3 top-3 sm:left-4 sm:top-4 z-[300]">
        <AuthLanguageSwitcher />
      </div>
      {children}
    </>
  );
}
