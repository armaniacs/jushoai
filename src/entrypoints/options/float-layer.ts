// Re-export shim over NoticeCenter (PBI-189): floating-notice behavior
// (slots, lifetime table, replacement token, timers, guide visibility) all
// lives in notice-center.ts. This module stays only so older import paths
// keep resolving; new code imports from './notice-center' directly. DOM
// only: no chrome APIs, no storage access.
export {
  TOAST_MS,
  type NoticeAction,
  type NoticeKind,
  type NoticePost,
  dismissGuideForSession,
  hideGuide,
  isGuideDismissed,
  post,
  resetNoticeCenter,
  showGuide,
} from './notice-center';
