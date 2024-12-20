import { GoogleGenerativeAI } from "@google/generative-ai";

const determineProficiency = async (responses: string): Promise<string> => {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY || "";
  const genAI = new GoogleGenerativeAI(apiKey);

  console.log("User responses:", responses);

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `
      Based on the provided responses from the user, determine the user's proficiency level. 
      Please ONLY return values separated by commas for each topic. There are 5 topics: 
      Two-Factor Authentication, Phishing, Password Security, Software Updates, and Online Privacy. 
      The values should be ordered according to the order of how the topics appear from the questions. 

      From the question choices, each choice is ordered alphabetically: starting from a, to b, to c, to d, to e, and so on.
      Look at the description attribute of the question to determine the proficiency, which maps the proficiency value to the letter of the choice.

      Behavioral questions determine whether the user can proceed to knowledge-based questions for a topic. 
      Beginner responses (e.g., "No, I don't know") result in a "beginner" classification for that topic.
      If the user answers all behavioral questions as an expert would, assess their responses to the knowledge questions.

      For knowledge questions, tally responses as beginner, intermediate, or expert. Assign the proficiency level for each topic based on the most frequent level:
        - If beginner responses > intermediate or expert, classify as beginner.
        - If intermediate responses > beginner or expert, classify as intermediate.
        - If expert responses > beginner or intermediate, classify as expert.
        - If equally distributed, classify as intermediate.

      Provide the proficiency levels for each topic in the following order: 
      Two-Factor Authentication, Phishing, Password Security, Software Updates, Online Privacy. 

      Responses: ${responses}
    `;

    const response = await model.generateContent(prompt);
    const textContent = (await response.response.text()).trim().toLowerCase();

    const validLevels = ["beginner", "intermediate", "expert"];
    const proficiencyLevels = textContent.split(", ");

    if (
      proficiencyLevels.length !== 5 ||
      !proficiencyLevels.every((level) => validLevels.includes(level))
    ) {
      throw new Error("Invalid proficiency levels generated");
    }

    console.log("Valid proficiency levels:", proficiencyLevels);
    return proficiencyLevels.join(", ");
  } catch (error) {
    console.error("Error determining proficiency:", error);
    return "error";
  }
};

export default determineProficiency;
