import { UploadProgressWidget } from "@/components/ui/UploadProgressWidget";

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <UploadProgressWidget />
    </>
  );
}
