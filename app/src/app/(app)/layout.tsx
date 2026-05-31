import TopNav from "@/components/navigation/TopNav";
import Footer from "@/components/navigation/Footer";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNav />
      <main className="min-h-screen pt-14">{children}</main>
      <Footer />
    </>
  );
}
