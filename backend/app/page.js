export const metadata = {
  title: "CampusFlow API Server | Chilika Institute of Technology",
  description: "REST API service for campus scheduling and venue management",
};

export default function BackendStatusPage() {
  return (
    <div style={{ 
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', 
      padding: '3rem 2rem', 
      maxWidth: '850px', 
      margin: '0 auto',
      color: '#1e293b'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ 
          width: '12px', 
          height: '12px', 
          borderRadius: '50%', 
          backgroundColor: '#10b981',
          boxShadow: '0 0 10px #10b981'
        }}></div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>CampusFlow Backend REST API Server</h1>
      </div>
      <p style={{ color: '#64748b', fontSize: '0.95rem', margin: '0 0 2rem 0' }}>
        Chilika Institute of Technology (CIT) • High Performance Scheduling Engine & Database Service
      </p>

      <div style={{ 
        backgroundColor: '#f8fafc', 
        border: '1px solid #e2e8f0', 
        borderRadius: '12px', 
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: '0 0 1rem 0' }}>Core Backend API Endpoints (20 Routes):</h2>
        <ul style={{ fontSize: '0.875rem', lineHeight: '1.8', color: '#334155', paddingLeft: '1.25rem', margin: 0 }}>
          <li><code style={{ color: '#4f46e5' }}>GET /api/dataset/summary</code> — Aggregated dataset statistics (27 rooms, 40 faculty, 189 sessions)</li>
          <li><code style={{ color: '#4f46e5' }}>POST /api/auth/login</code> — Role-based JWT authentication for 4 official roles</li>
          <li><code style={{ color: '#4f46e5' }}>GET /api/schedule/views</code> — Filter timetable by student group, faculty, or room</li>
          <li><code style={{ color: '#4f46e5' }}>GET /api/schedule/current</code> — Retrieve active baseline schedule</li>
          <li><code style={{ color: '#4f46e5' }}>GET /api/bookings</code> — Spectra fest week venue bookings lifecycle</li>
          <li><code style={{ color: '#4f46e5' }}>POST /api/bookings/decide</code> — Admin/Coordinator approval, rejection, or alternative allocation</li>
          <li><code style={{ color: '#4f46e5' }}>POST /api/ai/parse-booking</code> — NLP parsing of English & Hinglish requests with conflict check</li>
          <li><code style={{ color: '#4f46e5' }}>POST /api/ai/faculty-assistant</code> — Faculty change assistant with constraint validation</li>
          <li><code style={{ color: '#4f46e5' }}>GET /api/ai/explain</code> — Algorithmic decision explainer for bookings and class placements</li>
          <li><code style={{ color: '#4f46e5' }}>POST /api/disruptions/apply</code> — Minimal-move disruption solver (95.2% stability retention)</li>
          <li><code style={{ color: '#4f46e5' }}>GET /api/validator/run</code> — Live verification against official <code>validator.py</code></li>
          <li><code style={{ color: '#4f46e5' }}>GET /api/export/schedule</code> — Download official <code>schedule.json</code> deliverable</li>
          <li><code style={{ color: '#4f46e5' }}>GET /api/export/schedule-after</code> — Download official <code>schedule_after.json</code> deliverable</li>
        </ul>
      </div>

      <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
        Note: The user-facing interactive frontend is hosted separately in the <code>/frontend</code> directory.
      </p>
    </div>
  );
}
