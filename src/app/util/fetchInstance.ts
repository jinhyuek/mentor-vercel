import { auth } from '@/auth';
import { stat } from 'fs';
import { getSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { ErrorResponse, SuccessResponse } from '../Models/AxiosResponse';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type FetchOptions = {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    params?: Record<string, any>;
    next?: {
        revalidate?: number;
        tags?: string[];
    };
};

export const fetchWithToken = async <T>(url: string, options: FetchOptions = {}): Promise<SuccessResponse<T>> => {
    let token = '';
    let next;
    try {
        if (typeof window === 'undefined') {
            const session = await auth();
            token = session?.user?.access_Token || '';
        } else {
            const session = await getSession();
            token = session?.user?.access_Token || '';
        }
    } catch (error) {
        console.error('Failed to fetch session:', error);
    }

    if (typeof window === 'undefined') {
        next = options.next || {};
    } else {
        next = undefined;
    }
    // 사용자 정의 헤더와 기본 헤더 병합
    const headers: {
        [key: string]: string;
    } = token
        ? { ...options.headers, Authorization: `Bearer ${token}` } // 토큰이 있으면 Authorization 헤더에 추가
        : { ...options.headers };
    if (!headers['Content-Type'] && options.body) {
        headers['Content-Type'] = 'application/json'; // 기본값
    }

    // `Content-Type`이 명시되지 않은 경우 기본값 추가

    // 쿼리스트링 구성
    const queryParams = options.params
        ? '?' +
          Object.entries(options.params)
              .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
              .join('&')
        : '';

    // 전체 URL 구성
    const fullURL = `${API_URL}${url}${queryParams}`;

    // Fetch 요청
    const response = await fetch(fullURL, {
        method: options.method || 'GET',
        headers: {
            ...headers,
        },
        body: options.body
            ? headers['Content-Type'] === 'application/json'
                ? JSON.stringify(options.body)
                : options.body
            : undefined,
        // next,

        cache: 'no-store',
    });

    // 응답 상태 확인
    if (!response.ok) {
        let errorMessage = `HTTP Error: ${response.status}`;
        let errorData: ErrorResponse | null = null;

        try {
            errorData = await response.json();
            errorMessage = errorData?.message || errorMessage;
        } catch (error) {
            console.error('Failed to parse error response:', error);
        }
        throw {
            message: errorMessage,
            status: response.status,
            data: errorData,
        };
    }

    if (typeof window === 'undefined') {
        console.log('서버데이터 호출');
    }
    return response.json();
};
