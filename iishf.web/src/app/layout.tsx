import "./globals.css";
import { NavBarContainer } from "@/components/Navbar/NavBarContainer";
import { Footer } from "@/components/Footer/Footer";
import localFont from "next/font/local";

const raleway = localFont({
  src: "../fonts/Raleway-VariableFont_wght.ttf",
  variable: "--font-raleway",
  weight: "100 900",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={raleway.variable}>
      <body>
        <NavBarContainer />
        {children}
        <Footer />
      </body>
    </html>
  );
}
