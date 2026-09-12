import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Cathedra | Your classroom, remembered",
  description:
    "A private classroom seating reference. Student records stay in your browser.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
