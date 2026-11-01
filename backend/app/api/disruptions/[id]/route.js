import { NextResponse } from 'next/server';
import connectToDatabase from '../../../../lib/mongodb';
import { Disruption } from '../../../../models';
import { requireAuth } from '../../../../lib/auth';

export async function GET(request, { params }) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof Response) return authResult;
    const { user } = authResult;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Disruption ID is required' }, { status: 400 });
    }

    await connectToDatabase();
    const disruption = await Disruption.findById(id).lean();

    if (!disruption) {
      return NextResponse.json({ success: false, error: `Disruption '${id}' not found` }, { status: 404 });
    }

    // Role check: Admin can view any disruption; faculty/club can only view their own
    const isOwner = (disruption.requested_by === user.id || disruption.requested_by === user.name || disruption.source === user.role);
    const isAdmin = (user.role === 'admin');

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ success: false, error: 'Forbidden: Insufficient permissions to view this disruption' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      disruption,
      proposal: disruption.proposal,
      diff: disruption.proposal?.diff || [],
      validator: disruption.proposal?.validator || null,
      stability: disruption.stability_metrics || null,
      feasible: disruption.proposal?.feasible || false,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
