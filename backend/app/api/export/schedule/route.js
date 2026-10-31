import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const p1 = path.resolve(process.cwd(), '../exports/schedule.json');
    const p2 = path.resolve(process.cwd(), 'exports/schedule.json');
    const finalPath = fs.existsSync(p1) ? p1 : fs.existsSync(p2) ? p2 : null;

    if (!finalPath) {
      return NextResponse.json({ error: 'exports/schedule.json not found' }, { status: 404 });
    }

    const fileContent = fs.readFileSync(finalPath, 'utf8');
    const jsonData = JSON.parse(fileContent);

    return new NextResponse(JSON.stringify(jsonData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="schedule.json"',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
