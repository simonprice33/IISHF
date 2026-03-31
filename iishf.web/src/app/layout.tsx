import "./globals.css";
import { NavBarContainer } from "@/components/Navbar/NavBarContainer";
import { Footer } from "@/components/Footer/Footer";
import localFont from "next/font/local";

// CSS Files for 3rd party libraries
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "../styles/animatedHeadlines.css";
import "../styles/textStyles.css";

const raleway = localFont({
  src: "../fonts/Raleway-VariableFont_wght.ttf",
  variable: "--font-raleway",
  weight: "100 900",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={raleway.variable}>
      <head>
        {/* ✅ load icon font CSS from /public */}
        <link rel="stylesheet" href="/vendor/pe7stroke/pe-icon-7-stroke.css" />
      </head>
      <body>
        <NavBarContainer />
        {children}
        <Footer />
      </body>
    </html>
  );
}
