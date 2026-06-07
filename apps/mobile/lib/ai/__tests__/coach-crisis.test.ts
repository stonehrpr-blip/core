import { detectCrisis } from "../coach-crisis";

describe("detectCrisis", () => {
  it("flags explicit self-harm / suicidal phrasings", () => {
    const positives = [
      "I want to kill myself",
      "I've been thinking about killing myself",
      "I just want to end my life",
      "honestly I want to end it all",
      "I want to die",
      "i wanna die",
      "sometimes I feel like everyone would be better off dead",
      "I'm having suicidal thoughts",
      "is this suicide ideation",
      "I keep thinking about self harm",
      "I want to self-harm again",
      "I might hurt myself tonight",
      "I want to harm myself",
      "I keep cutting myself",
      "there's no reason to live anymore",
      "no point in going on",
      "I don't want to be here anymore",
      "I can't go on like this",
      "I can't take it anymore",
    ];
    for (const p of positives) {
      expect({ text: p, flagged: detectCrisis(p) }).toEqual({ text: p, flagged: true });
    }
  });

  it("is case-insensitive", () => {
    expect(detectCrisis("I WANT TO KILL MYSELF")).toBe(true);
    expect(detectCrisis("Suicidal")).toBe(true);
  });

  it("does not flag ordinary cravings / venting (no false positives)", () => {
    const negatives = [
      "I'm about to slip",
      "this craving is killing me",
      "work is killing me lately",
      "I'd die for a vape right now",
      "I'm dying to know how I'm doing this week",
      "my willpower is dead",
      "I want to quit so badly",
      "I had a rough day, feeling low",
      "help me reframe a craving",
      "I can't stop thinking about vaping",
      "",
    ];
    for (const n of negatives) {
      expect({ text: n, flagged: detectCrisis(n) }).toEqual({ text: n, flagged: false });
    }
  });
});
