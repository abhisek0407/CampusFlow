import connectToDatabase from './mongodb';
import { Disruption, Schedule, AuditLog } from '../models';
import { repair } from './pythonBridge';
import { isIsoDate, eachDate, weekdayOf } from './dateUtils';

/**
 * Normalise changes coming from the LLM / UI so the solver never crashes on shape.
 * - faculty users are ALWAYS forced to their own linked_faculty_id (LLM may hallucinate an id)
 * - days -> upper-case 3 letter codes, periods -> integers
 */
export function normalizeChanges(changes, user) {
    const out = [];
    for (const raw of changes || []) {
        const ch = { ...raw };
        if (ch.type === 'faculty_unavailable') {
            if (user.role === 'faculty') ch.faculty_id = user.linked_faculty_id;
            const days = Array.isArray(ch.days) ? ch.days : ch.day ? [ch.day] : [];
            ch.days = days.map((d) => String(d).trim().slice(0, 3).toUpperCase());
            const periods = Array.isArray(ch.periods) ? ch.periods : ch.period ? [ch.period] : [1, 2, 3, 4, 5, 6, 7, 8, 9];
            ch.periods = periods.map((p) => Number(p)).filter((p) => Number.isInteger(p));
            ch.reason = ch.reason || 'Faculty unavailability request';

            // Dated leave: dates are authoritative. Without dates the leave would repeat every week.
            if (isIsoDate(ch.date_from) || isIsoDate(ch.date_to)) {
                let from = isIsoDate(ch.date_from) ? ch.date_from : ch.date_to;
                let to = isIsoDate(ch.date_to) ? ch.date_to : from;
                if (to < from) [from, to] = [to, from];
                const range = eachDate(from, to, 93);
                ch.date_from = from;
                ch.date_to = range[range.length - 1];
                ch.days = [...new Set(range.map(weekdayOf))]; // e.g. Sat+Sun -> ['SAT','SUN']
            } else {
                delete ch.date_from;
                delete ch.date_to;
            }
        }
        out.push(ch);
    }
    return out;
}

/** Shared by /api/disruptions/propose and /api/ai/faculty-assistant */
export async function createProposal({ user, title, changes, reason }) {
    await connectToDatabase();

    if (!title || !Array.isArray(changes) || changes.length === 0) {
        return { status: 400, body: { success: false, error: 'Title and changes array are required' } };
    }

    if (user.role === 'faculty') {
        if (!user.linked_faculty_id) {
            return { status: 403, body: { success: false, error: 'Your faculty account has no linked faculty ID. Please contact admin.' } };
        }
        for (const ch of changes) {
            if (ch.type !== 'faculty_unavailable') {
                return { status: 403, body: { success: false, error: 'Forbidden: Faculty can only submit faculty_unavailable requests' } };
            }
        }
    }

    const normalized = normalizeChanges(changes, user);
    for (const ch of normalized) {
        if (ch.type === 'faculty_unavailable' && (!ch.faculty_id || !ch.days.length || !ch.periods.length)) {
            return { status: 400, body: { success: false, error: 'faculty_unavailable needs faculty_id, days and periods' } };
        }
    }

    const currentSchedule = await Schedule.findOne({ _id: 'SCHEDULE_CURRENT' }).lean();
    if (!currentSchedule) {
        return { status: 404, body: { success: false, error: 'No active schedule found to propose changes against' } };
    }

    let repairResult;
    try {
        repairResult = await repair({ changes: normalized }, currentSchedule, 30, 4);
    } catch (solveErr) {
        return { status: 500, body: { success: false, error: `Solver error: ${solveErr.message}` } };
    }

    const disruptionId = `DISRUPT-${Date.now().toString().slice(-6)}`;
    // Faculty requests stay a private DRAFT until the faculty confirms "Submit to Admin".
    // Admin-created proposals keep the old behaviour (analyzed immediately).
    const initialStatus = user.role === 'faculty' ? 'draft' : 'analyzed';
    await Disruption.create({
        _id: disruptionId,
        title,
        source: user.role,
        requested_by: user.id || user.name,
        base_version: currentSchedule.version || 1,
        changes: normalized,
        status: initialStatus,
        proposal: repairResult,
        stability_metrics: {
            sessions_moved: repairResult.diff ? repairResult.diff.length : 0,
            time_changed: repairResult.validator?.stability?.time_changed || 0,
            room_only_changed: repairResult.validator?.stability?.room_only_changed || 0,
            moved_ids: repairResult.diff ? repairResult.diff.map((d) => d.session_id) : [],
        },
    });

    try {
        if (initialStatus === 'draft') throw new Error('draft - audit written on submit');
        await AuditLog.create({
            _id: `LOG-DISRUPT-${Date.now()}`,
            user_id: user.id || user.name,
            action: 'DISRUPTION_PROPOSED',
            entity_type: 'disruption',
            entity_id: disruptionId,
            description: `Disruption proposal "${title}" created by ${user.name} (${user.role}) with base version ${currentSchedule.version}. Feasible: ${repairResult.feasible}. ${reason || ''}`,
            timestamp: new Date(),
        });
    } catch (e) {
        /* non critical */
    }

    return {
        status: 200,
        body: {
            success: true,
            message: 'Disruption proposal generated and analyzed successfully',
            disruption_id: disruptionId,
            status: initialStatus,
            base_version: currentSchedule.version,
            proposal: repairResult,
        },
    };
}