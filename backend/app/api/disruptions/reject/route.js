import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/mongodb';
import { Disruption, AuditLog } from '../../../../models';
import { requireAuth } from '../../../../lib/auth';

export async function POST(request) {
  try {
    const authResult = await requireAuth(request, ['admin']);
    if (authResult instanceof Response) return authResult;
    const { user } = authResult;

    await connectToDatabase();
    const body = await request.json();
    const { disruption_id, reason } = body;

    if (!disruption_id) {
      return NextResponse.json({ success: false, error: 'disruption_id is required' }, { status: 400 });
    }

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return NextResponse.json({ success: false, error: 'Rejection reason is required' }, { status: 400 });
    }

    const disruption = await Disruption.findById(disruption_id);
    if (!disruption) {
      return NextResponse.json({ success: false, error: `Disruption '${disruption_id}' not found` }, { status: 404 });
    }

    disruption.status = 'rejected';
    disruption.decision_reason = reason.trim();
    disruption.approved_by = user.name;
    await disruption.save();

    // Audit Log (schedule remains completely untouched)
    try {
      await AuditLog.create({
        _id: `LOG-DISRUPT-REJ-${Date.now()}`,
        user_id: user.id || user.name,
        action: 'DISRUPTION_REJECTED',
        entity_type: 'disruption',
        entity_id: disruption._id,
        description: `Disruption "${disruption.title}" rejected by ${user.name}: ${reason}`,
        timestamp: new Date(),
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: 'Disruption rejected successfully',
      disruption,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
