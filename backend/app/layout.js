import "./globals.css";

export const metadata = {
  title: "CampusFlow | CIT Campus Scheduling & Venue Management",
  description: "Official scheduling and venue platform for Chilika Institute of Technology",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
