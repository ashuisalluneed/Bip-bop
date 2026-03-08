import { authRouter } from "~/server/api/routers/auth";
import { videoRouter } from "~/server/api/routers/video";
import { userRouter } from "~/server/api/routers/user";
import { commentRouter } from "~/server/api/routers/comment";
import { followRouter } from "~/server/api/routers/follow";
import { searchRouter } from "~/server/api/routers/search";
import { messageRouter } from "~/server/api/routers/message";
import { notificationRouter } from "~/server/api/routers/notification";
import { studioRouter } from "~/server/api/routers/studio";
import { hashtagRouter } from "~/server/api/routers/hashtag";
import { webrtcRouter } from "~/server/api/routers/webrtc";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  auth: authRouter,
  video: videoRouter,
  user: userRouter,
  comment: commentRouter,
  follow: followRouter,
  search: searchRouter,
  message: messageRouter,
  webrtc: webrtcRouter,
  notification: notificationRouter,
  studio: studioRouter,
  hashtag: hashtagRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
