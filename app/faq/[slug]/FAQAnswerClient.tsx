"use client";

import { useState } from "react";
import { FAQTypingText } from "@/components/FAQTypingText";
import { MatrixEffect } from "@/components/MatrixEffect";

type Props = {
  text: string;
  matrixEnding?: string;
};

export function FAQAnswerClient({ text, matrixEnding }: Props) {
  const [showMatrix, setShowMatrix] = useState(false);

  const handleTypingComplete = () => {
    if (matrixEnding) setShowMatrix(true);
  };

  return (
    <>
      <FAQTypingText text={text} onComplete={handleTypingComplete} />
      {showMatrix && matrixEnding && (
        <MatrixEffect
          text={matrixEnding}
          onComplete={() => setShowMatrix(false)}
        />
      )}
    </>
  );
}
