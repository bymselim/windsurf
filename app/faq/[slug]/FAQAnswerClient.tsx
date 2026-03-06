"use client";

import { useState } from "react";
import { FAQTypingText } from "@/components/FAQTypingText";
import { MatrixEffect } from "@/components/MatrixEffect";

type Props = {
  text: string;
  matrixEnding?: string;
  slug?: string;
};

export function FAQAnswerClient({ text, matrixEnding, slug }: Props) {
  const [typingComplete, setTypingComplete] = useState(false);
  const [showMatrix, setShowMatrix] = useState(false);

  const handleTypingComplete = () => {
    setTypingComplete(true);
  };

  return (
    <>
      <div className="space-y-8">
        <FAQTypingText text={text} onComplete={handleTypingComplete} />
        {typingComplete && matrixEnding && !showMatrix && (
          <div className="flex justify-center pt-4">
            <button
              type="button"
              onClick={() => setShowMatrix(true)}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-medium rounded-lg transition"
            >
              Gerçek Cevap için Tıklayın
            </button>
          </div>
        )}
      </div>
      {showMatrix && matrixEnding && (
        <MatrixEffect text={matrixEnding} slug={slug} />
      )}
    </>
  );
}
