import "./globals.css";
import { NavBarContainer } from "@/components/Navbar/NavBarContainer";
import { Footer } from "@/components/Footer/Footer";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavBarContainer />
        {children}
        <Footer />
      </body>
    </html>
  );
}
