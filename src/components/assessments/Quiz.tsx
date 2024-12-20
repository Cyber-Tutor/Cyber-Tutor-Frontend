import React from "react";

type QuizProps = {
  questions: Record<
    string,
    {
      question: string;
      options: string[];
      correctAnswer: string;
    }
  >;
};

const Quiz = ({ questions }: QuizProps) => {
  const QuizQuestion = ({ data }: { data: QuizProps["questions"][string] }) => {
    return (
      <div>
        <h2>{data.question}</h2>
        <ul>
          {data.options.map((option: string, index: number) => (
            <li key={index}>
              <label>
                <input type="radio" name="answer" value={option} /> {option}
              </label>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div>
      {Object.entries(questions).map(([key, value]) => (
        <QuizQuestion key={key} data={value} />
      ))}
    </div>
  );
};

export default Quiz;
