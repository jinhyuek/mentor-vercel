import { MentorResponseType } from '@/app/Models/mentorType';
import { FetchErrorResponseType } from '@/app/Models/AxiosResponse';
import { useQuery } from '@tanstack/react-query';
import { SubBoardResponseType } from '@/app/Models/subBoardType';
import { HOME_MENTOR_QUERYKEY } from '@/app/queryKeys/mentorKey';
import { QUEST_SUBBOARD_QUERYKEY, REQUEST_SUBBOARD_QUERYKEY } from '@/app/queryKeys/subBoardKey';
import { fetchWithToken } from '@/app/util/fetchInstance';

export const getHomeMentorPosts = async (): Promise<MentorResponseType> => {
    const params = {
        page: 1,
        size: 7,
        schoolFilter: false,
        favoriteFilter: false,
    };

    const response = await fetchWithToken<MentorResponseType>('/api/boards/filter', {
        method: 'GET',
        params: params,
        next: {
            revalidate: 60,
            tags: [...HOME_MENTOR_QUERYKEY],
        },
    });
    return response.data; //나중에 타입 수정해야함
};

export const getHomeQuestsOrRequests = async ({
    pageParam,
    size,
    subBoardType,
}: {
    pageParam: number;
    size: number;
    subBoardType: 'QUEST' | 'REQUEST';
    //메인 게시판에서 사용하는 경우 pageParam,size,subBoardType은 필수
}): Promise<SubBoardResponseType> => {
    const params = {
        page: pageParam,
        size: size,
        schoolFilter: false,
        subBoardType: subBoardType,
        favoriteFilter: false,
    };

    const response = await fetchWithToken<SubBoardResponseType>('/api/subBoards', {
        method: 'GET',
        params: params,
        next: {
            revalidate: 60,
            tags: [...(subBoardType === 'QUEST' ? QUEST_SUBBOARD_QUERYKEY : REQUEST_SUBBOARD_QUERYKEY), 'home'],
        },
    });

    return response.data;
};

//----------------------------------useQuery----------------------------------

export const useHomeMentorPostsQeury = () => {
    const query = useQuery<MentorResponseType, FetchErrorResponseType>({
        queryKey: HOME_MENTOR_QUERYKEY,
        queryFn: getHomeMentorPosts,
        staleTime: 1000 * 60,
        gcTime: 1000 * 60 * 5,
    });
    return query;
};

export const useHomeQuestsQuery = () => {
    const query = useQuery<SubBoardResponseType, FetchErrorResponseType>({
        queryKey: [...QUEST_SUBBOARD_QUERYKEY, 'home'],
        queryFn: () =>
            getHomeQuestsOrRequests({
                pageParam: 1,
                size: 7,
                subBoardType: 'QUEST',
            }),
        staleTime: 1000 * 60,
        gcTime: 1000 * 60 * 5,
    });
    return query;
};
export const useHomeRequestsQuery = () => {
    const query = useQuery<SubBoardResponseType, FetchErrorResponseType>({
        queryKey: [...REQUEST_SUBBOARD_QUERYKEY, 'home'],
        queryFn: () =>
            getHomeQuestsOrRequests({
                pageParam: 1,
                size: 7,
                subBoardType: 'REQUEST',
            }),
        staleTime: 1000 * 60,
        gcTime: 1000 * 60 * 5,
    });
    return query;
};
