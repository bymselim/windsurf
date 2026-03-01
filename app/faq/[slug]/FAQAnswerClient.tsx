"use client";

import { FAQTypingText } from "@/components/FAQTypingText";

type Props = {
  text: string;
};

export function FAQAnswerClient({ text }: Props) {
  return <FAQTypingText text={text} />;
}
