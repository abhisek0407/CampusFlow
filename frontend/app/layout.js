import "./globals.css";

export const metadata = {
  title: "CampusFlow | CIT Campus Scheduling & Venue Management",
  description: "Official campus scheduling, timetable optimization, and venue management platform for Chilika Institute of Technology",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
