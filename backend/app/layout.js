export const metadata = {
  title: "CampusFlow API Server | Chilika Institute of Technology",
  description: "REST API service for campus scheduling and venue management",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#f8fafc', color: '#0f172a' }}>
        {children}
      </body>
    </html>
  );
}
