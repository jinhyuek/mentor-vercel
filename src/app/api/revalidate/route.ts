export const dynamic = 'force-dynamic';
export const revalidate = 0;
import type { NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';

export async function GET(request: NextRequest) {
    const tag = request.nextUrl.searchParams.get('tag');
    if (!tag) {
        return Response.json({ evalidated: false, now: Date.now() });
    }
    revalidateTag(tag);
    console.log('유효시간 갱신됨', tag);
    return Response.json({ revalidated: true, now: Date.now() });
}
