import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/mongodb';
import { Disruption, AuditLog } from '../../../../models';
import { requireAuth } from '../../../../lib/auth';

/**
 * Faculty confirms (or discards) a DRAFT proposal.
 * Body: { disruption_id, action: 'submit' | 'discard' }
 * submit  -> draft becomes 'analyzed' (now visible to admin for approval)
 * discard -> draft is deleted
 */
export async function POST(request) {
    try {
        const authResult = await requireAuth(request, ['faculty', 'admin']);
        if (authResult instanceof Response) return authResult;
        const { user } = authResult;

        const { disruption_id, action = 'submit' } = await request.json().catch(() => ({}));
        if (!disruption_id) {
            return NextResponse.json({ success: false, error: 'disruption_id is required' }, { status: 400 });
        }

        await connectToDatabase();
        const d = await Disruption.findById(disruption_id);
        if (!d) return NextResponse.json({ success: false, error: 'Request not found' }, { status: 404 });

        const isOwner = d.requested_by === user.id || d.requested_by === user.name;
        if (!isOwner && user.role !== 'admin') {
            return NextResponse.json({ success: false, error: 'Forbidden: this is not your request' }, { status: 403 });
        }
        if (d.status !== 'draft') {
            return NextResponse.json({ success: false, error: `Request is already '${d.status}'` }, { status: 409 });
        }

        if (action === 'discard') {
            await Disruption.deleteOne({ _id: disruption_id });
            return NextResponse.json({ success: true, discarded: true, disruption_id });
        }

        d.status = 'analyzed';
        await d.save();

        try {
            await AuditLog.create({
                _id: `LOG-DISRUPT-${Date.now()}`,
                user_id: user.id || user.name,
                action: 'DISRUPTION_SUBMITTED',
                entity_type: 'disruption',
                entity_id: disruption_id,
                description: `"${d.title}" submitted to admin by ${user.name} (${user.role}) for approval.`,
                timestamp: new Date(),
            });
        } catch (e) {
            /* non critical */
        }

        return NextResponse.json({ success: true, submitted: true, disruption_id, status: d.status });
    } catch (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}