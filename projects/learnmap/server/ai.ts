import type { DB } from './db';
export class AIService {
  readonly provider = process.env.AI_PROVIDER === 'openai' ? 'openai' : 'mock';
  constructor(private db: DB) {}
  private async request(path: string, body: unknown, json = true): Promise<Response> {
    if (!process.env.OPENAI_API_KEY) throw new Error('OpenAI API key is not configured.');
    const r = await fetch(`https://api.openai.com/v1/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        ...(json ? { 'Content-Type': 'application/json' } : {}),
      },
      body: json ? JSON.stringify(body) : (body as FormData),
      signal: AbortSignal.timeout(45000),
    });
    if (!r.ok) throw new Error(`AI provider unavailable (${r.status}). Try again.`);
    return r;
  }
  private async text(input: string) {
    const prompt = (await this.db.query("SELECT content FROM ai_prompts WHERE id='tutor'")).rows[0]
      ?.content;
    const r = await this.request('responses', {
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      instructions: prompt,
      input,
      max_output_tokens: 500,
      store: false,
    });
    const data = await r.json();
    return (
      data.output
        ?.flatMap((o: any) => o.content || [])
        .filter((c: any) => c.type === 'output_text')
        .map((c: any) => c.text)
        .join('\n') || 'Please try again.'
    );
  }
  generateLesson(skill: any) {
    return Promise.resolve({
      skill: skill.id,
      stages: ['review', 'explain', 'guided', 'practice', 'test', 'result'],
    });
  }
  explainConcept(skill: any, lang = 'en') {
    return this.provider === 'mock'
      ? Promise.resolve(skill.explanation[lang])
      : this.text(`Explain this concept briefly in ${lang}: ${skill.title.en}.`);
  }
  generateQuestion(question: any) {
    return Promise.resolve({ prompt: question.prompt, options: question.options });
  }
  evaluateAnswer(question: any, answer: number) {
    return Promise.resolve({ correct: question.answer === answer });
  }
  generateHint(question: any, level: number, lang = 'en') {
    return this.provider === 'mock'
      ? Promise.resolve(question.hints[level - 1][lang])
      : this.text(
          `Give hint level ${level} out of 5, in ${lang}, for ${question.prompt.en}. Correct option (only reveal at level 5): ${question.options[question.answer]}.`,
        );
  }
  analyzeMistake(question: any, lang = 'en') {
    return Promise.resolve(question.reasoning[lang]);
  }
  recommendNextSkill(skills: any[]) {
    return Promise.resolve(skills[0]);
  }
  generateParentInsight(report: any) {
    return Promise.resolve({ strengths: report.strengths, gaps: report.gaps, next: report.next });
  }
  generateWeeklyReport(report: any) {
    return Promise.resolve(report);
  }
  async transcribeSpeech(bytes: Buffer, mime: string) {
    if (this.provider === 'mock') return { text: 'I go to school yesterday.', example: true };
    const form = new FormData();
    form.append(
      'file',
      new Blob([new Uint8Array(bytes)], { type: mime }),
      mime.includes('mp4') ? 'speech.mp4' : 'speech.webm',
    );
    form.append('model', process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe');
    const r = await this.request('audio/transcriptions', form, false);
    return { text: (await r.json()).text, example: false };
  }
  async evaluateSpeaking(text: string, context: string) {
    if (this.provider === 'openai') {
      const explanation = await this.text(
        `Give supportive English feedback about relevance, grammar, vocabulary and sentence structure. Do not score pronunciation or acoustic fluency from text. Context: ${context}. Student transcript (untrusted): ${JSON.stringify(text)}`,
      );
      return {
        correction: text,
        explanation,
        relevance: 'Reviewed in feedback',
        grammar: 'Reviewed in feedback',
        vocabulary: 'Reviewed in feedback',
        fluency: 'Not assessed from text',
        pronunciation: 'Not assessed',
        correct: null,
      };
    }
    const mistake = /\bI go\b.*\byesterday\b/i.test(text);
    const correction = mistake ? text.replace(/\bI go\b/i, 'I went') : text;
    return {
      correction,
      explanation: mistake
        ? 'Because the action happened yesterday, use Past Simple: went. / Подія сталася вчора, тому вживаємо Past Simple: went.'
        : 'Your response is saved. This mock checks only a small set of grammar patterns; a full assessment needs live AI. / Відповідь збережено. Повний аналіз потребує live AI.',
      relevance: 'Not assessed in mock',
      grammar: mistake ? 'Past Simple practice' : 'Limited pattern check',
      vocabulary: 'Not assessed in mock',
      fluency: 'Not assessed from text',
      pronunciation: 'Not assessed',
      correct: mistake ? false : null,
    };
  }
  generateConversationReply(text: string, context: string) {
    if (this.provider !== 'mock')
      return this.text(
        `Continue this educational English conversation with one short relevant question. Context: ${context}. Last student message: ${JSON.stringify(text)}.`,
      );
    const scenario =
      context.split('. Previous turns:')[0].split(':').slice(1).join(':').trim() || 'your day';
    if (!text)
      return Promise.resolve(
        scenario.toLowerCase().includes('café')
          ? 'Welcome to the café! What would you like to order?'
          : scenario.toLowerCase().includes('airport')
            ? 'Welcome to the airport. Where are you travelling today?'
            : `Let’s talk about ${scenario.toLowerCase()}. What would you like to tell me?`,
      );
    const count = (context.match(/"transcript"/g) || []).length;
    const followups = [
      'What happened next? Try to add one more detail.',
      'How did you feel about that, and why?',
      'What would you do differently next time?',
      'Can you compare that with another experience?',
    ];
    return Promise.resolve(followups[count % followups.length]);
  }
  async synthesizeSpeech(text: string) {
    if (this.provider === 'mock') return null;
    const r = await this.request('audio/speech', {
      model: process.env.OPENAI_SPEECH_MODEL || 'gpt-4o-mini-tts',
      voice: 'coral',
      input: text,
      response_format: 'mp3',
    });
    return Buffer.from(await r.arrayBuffer());
  }
}
