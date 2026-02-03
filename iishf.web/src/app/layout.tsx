import "./globals.css";
import { NavBarContainer } from "../components/Navbar/NavBarContainer";
import { Footer } from "../components/Navbar/Footer/Footer";  

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <NavBarContainer />
        <main className="site-main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
