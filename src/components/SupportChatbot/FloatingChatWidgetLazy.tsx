"use client";

import dynamic from "next/dynamic";

// The chat widget pulls in react-markdown and the full conversation UI, none of
// which is needed for first paint (the widget starts collapsed). Loading it in
// a separate client-only chunk keeps that weight out of the main bundle so the
// rest of the app hydrates faster. The launcher button appears a beat later,
// which is fine for a support affordance.
const FloatingChatWidget = dynamic(
  () => import("./FloatingChatWidget").then((m) => m.default),
  { ssr: false, loading: () => null }
);

export default function FloatingChatWidgetLazy() {
  return <FloatingChatWidget />;
}
