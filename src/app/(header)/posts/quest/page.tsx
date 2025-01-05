// export const dynamic = 'force-dynamic';
// export const revalidate = 0;

import { Metadata } from 'next';
import PostsQuests from './_component/PostsQuests';
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import FilterNav from '../_component/postsNav/FilterNav';
import { auth } from '@/auth';
import { getSubBoardsPosts } from '../_lib/qeustOrRequestService';
import { createSubBoardPostsKey } from '@/app/queryKeys/subBoardKey';
import { QUEST_SUBBOARD_QUERYKEY } from '@/app/queryKeys/keys';
import { serverParam } from '../utils/serverParam';

export const metadata: Metadata = {
    title: '자유 질문',
};
type Props = {
    searchParams: { [key: string]: string | undefined };
};
export default async function RequestsPage({ searchParams }: Props) {
    const session = await auth();

    const { pageParam, sizeParam, categoryParam, searchParam, schoolFilterParam, starParam } = serverParam({
        searchParams,
    }); //검색 파라미터

    const queryClient = new QueryClient();

    await queryClient.prefetchQuery({
        queryKey: [...QUEST_SUBBOARD_QUERYKEY, pageParam, 15, categoryParam, searchParam, schoolFilterParam, starParam],
        queryFn: () =>
            getSubBoardsPosts({
                pageParam,
                size: 15,
                categoryParam,
                searchParam,
                isSchool: schoolFilterParam,
                subBoardType: 'QUEST',
                isStar: starParam,
            }),
    });
    const dehydratedState = dehydrate(queryClient);

    return (
        <HydrationBoundary state={dehydratedState}>
            <FilterNav isLogin={Boolean(session)} />
            <PostsQuests />
        </HydrationBoundary>
    );
}
