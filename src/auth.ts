import axios from 'axios';

import NextAuth, { CredentialsSignin, User } from 'next-auth';

import CredentialsProvider from 'next-auth/providers/credentials';
import 'next-auth/jwt';
import { ErrorResponse } from './app/Models/AxiosResponse';
import { JWT } from 'next-auth/jwt';

export type MemberDto = {
    id?: number;
    email?: string;
    name?: string;
    year?: number;
    gender?: string;
    schoolName?: string;
    majorName?: string;
    memberImageUrl?: string;
};
declare module 'next-auth' {
    interface User {
        /** The user's postal address. */
        access_Token: string;
        refresh_Token: string;
        memberDTO: MemberDto;
    }
    // interface Session {
    //     accessTokens: string;
    // }
}
type RefreshTokenResponse = {
    data: {
        accessToken: string;
        refreshToken: string;
    };
    message: string;
    success: boolean;
};

let initialRefreshTokenRequest: {
    access_Token: string;
    refresh_Token: string;
    access_TokenExpires: number;
} | null; //리프레쉬 토큰갱신 함수가 jwt콜백에 의해 여러번 호출 되는 경우를 방지하고자, 추적 변수를 만들어 초기 갱신 요청을 저장

async function refreshAccessToken(token: JWT) {
    const now = Math.floor(Date.now() / 1000);

    if (initialRefreshTokenRequest && initialRefreshTokenRequest.access_TokenExpires - now >= 90) {
        return {
            ...token,
            ...initialRefreshTokenRequest,
        };
    } //갱신 요청이 이미 있고, 만료시간이 90초 이상 남았을 경우, 갱신 요청을 재사용(여러번 호출되는 경우 방지)

    try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/refresh`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token.refresh_Token}`,
            },
        });
        console.log('다시실행', token);
        console.log('다시실행');
        if (!response.ok) throw response;

        const responseTokens: RefreshTokenResponse = await response.json();
        const access_Token = responseTokens.data.accessToken; //액세스 토큰
        const refresh_Token = responseTokens.data.refreshToken; //리프레시 토큰

        const payloadPart = access_Token.split('.')[1];
        const decodedPayload = JSON.parse(atob(payloadPart));
        const access_TokenExpires = decodedPayload.exp; //토큰 만료시간
        console.log('리프레쉬갱신', '토큰', access_Token, '만료시간', decodedPayload.exp);

        initialRefreshTokenRequest = {
            access_Token,
            refresh_Token,
            access_TokenExpires,
        }; //갱신 요청 저장(여러번 호출되는 경우 방지)

        if (!response.ok) {
            throw response;
        } //리프레시 토큰이 만료된 경우

        return {
            ...token,
            access_Token,
            refresh_Token,
            access_TokenExpires,
        };
    } catch (error) {
        if (error instanceof Response) {
            const errorResponse: ErrorResponse = await error.json();
            if (errorResponse.message === '유효하지 않은 토큰입니다.' || errorResponse.message === '권한 없음') {
                return null;
            }
        }
        console.log('서버에러', error);
        return {
            ...token,
        };
    }
}

export const {
    handlers,
    auth,
    unstable_update: update, //실험 기능
} = NextAuth({
    pages: {
        signIn: '/account/login',
        newUser: '/account/signup',
        error: '/account/login',
    },
    trustHost: true,

    providers: [
        CredentialsProvider({
            async authorize(credentials) {
                const data = {
                    email: credentials.username,
                    password: credentials.password,
                };

                const authResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/member/signIn`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data),
                });

                if (!authResponse.ok) {
                    const credentialsSignin = new CredentialsSignin();
                    if (authResponse.status === 401) {
                        credentialsSignin.code = 'wrong_password';
                    } else if (authResponse.status === 404) {
                        credentialsSignin.code = 'no_user';
                    }
                    throw credentialsSignin;
                }

                const userResponse = await authResponse.json();
                console.log('유저응답', userResponse);
                const user: User = {
                    access_Token: userResponse.data.tokenDTO.accessToken,
                    refresh_Token: userResponse.data.tokenDTO.refreshToken,
                    memberDTO: userResponse.data.memberDTO,
                };

                return user;
            },
        }),
    ],

    callbacks: {
        async jwt({ token, user, session, trigger }) {
            // console.log('유저', user);
            // console.log('세션', session);
            // console.log('트리거', trigger);
            const now = Math.floor(Date.now() / 1000);
            const accessTokenExpires = token.access_TokenExpires as number;
            // console.log('작동중');
            // console.log('토큰 만료 몇초 남음', accessTokenExpires - now);

            if (user) {
                const payloadPart = user.access_Token.split('.')[1];
                const decodedPayload = JSON.parse(atob(payloadPart));
                token.refresh_Token = user.refresh_Token; // 리프레시 토큰
                token.access_Token = user.access_Token; // 액세스 토큰
                token.access_TokenExpires = decodedPayload.exp; // 토큰 만료 시간
                token.memberDTO = user.memberDTO; // 사용자 정보
                console.log('실행', decodedPayload.iat, decodedPayload.exp);

                return token;
            } else if (accessTokenExpires - now >= 90) {
                if (trigger === 'update' && session) {
                    token = { ...token, memberDTO: session.user.memberDTO };
                }
                return token;
            } else {
                // console.log('토큰 만료');
                // console.log('토큰 만료', accessTokenExpires - now);
                // console.log('재실행');

                return refreshAccessToken(token);
            }
        },

        async session({ session, token }: any) {
            // memberDTO를 제외한 나머지 토큰 정보를 세션에 추가

            const sessionUser = {
                ...token,
            };
            // console.log('세션유저', sessionUser);
            delete sessionUser.refresh_Token;
            // delete sessionUser.access_TokenExpires;
            session.user = Object.assign(session.user, sessionUser);
            delete session.expires;

            // console.log('세션', session);
            // console.log(
            //     '만료 시간',
            //     new Date(token.access_TokenExpires * 1000).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
            // );
            return session;
        },
        async redirect({ url, baseUrl }) {
            // Allows relative callback URLs
            if (url.startsWith('/')) return `${baseUrl}${url}`;
            // Allows callback URLs on the same origin
            else if (new URL(url).origin === baseUrl) return url;
            return baseUrl;
        },
    },
});

declare module 'next-auth/jwt' {
    interface JWT {
        access_Token: string;
        access_TokenExpires: number;
        refresh_Token: string;
        memberDTO: MemberDto;
    }
} // Auth.js에서 사용할 JWT 타입을 확장
