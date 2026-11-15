function parseQuestions(text) {
  const lines = text.replace(/\r/g, "").split("\n");
  const questions = [];
  let title = [];
  let options = [];
  let explanation = [];
  let readingExplanation = false;

  function save() {
    const correct = options.filter(o => o.correct);

    if (title.length && options.length >= 2 && options.length <= 12 && correct.length === 1) {
      questions.push({
        title: title.join(" ").trim(),
        options,
        correct: options.findIndex(o => o.correct),
        explanation: explanation.join(" ").trim()
      });
    }

    title = [];
    options = [];
    explanation = [];
    readingExplanation = false;
  }

  for (const original of lines) {
    const line = original.trim();
    if (!line) continue;

    const newQuestion = /^(?:Q(?:uestion)?|سؤال)\s*[0-9٠-٩]+\s*[.)\-:]/i.test(line);

    if (newQuestion && options.length >= 2) {
      save();
      title.push(line.replace(/^(?:Q(?:uestion)?|سؤال)\s*[0-9٠-٩]+\s*[.)\-:]\s*/i, ""));
      continue;
    }

    const match = line.match(/^\s*(?:\(([A-Za-zأ-ي0-9٠-٩]+)\)|([A-Za-zأ-ي0-9٠-٩]+)[.)\-:])\s*(.+)$/);

    if (match && !readingExplanation) {
      options.push({
        text: match[3].replace(/✅|✔️|✓/g, "").trim(),
        correct: /✅|✔️|✓/.test(match[3])
      });
      continue;
    }

    if (options.length === 0) {
      title.push(line);
    } else {
      if (/^(explanation|explain|why|الشرح|شرح|التوضيح|التفسير|لماذا)\s*[:：\-]?/i.test(line)) {
        readingExplanation = true;
        explanation.push(line.replace(/^(explanation|explain|why|الشرح|شرح|التوضيح|التفسير|لماذا)\s*[:：\-]?\s*/i, ""));
      } else {
        readingExplanation = true;
        explanation.push(line);
      }
    }
  }

  save();
  return questions;
}

export function registerCommands(bot) {
  bot.command("start", ctx =>
    ctx.reply("مرحباً بك 🤖\nأرسل الأسئلة مع الاختيارات، وضع ✅ بجانب الإجابة الصحيحة.")
  );

  bot.command("help", ctx =>
    ctx.reply(
      "مثال:\n\n" +
      "Q1. What is the powerhouse of the cell?\n" +
      "A. Nucleus\n" +
      "B. Mitochondria ✅\n" +
      "C. Ribosome\n" +
      "D. Golgi apparatus\n" +
      "Explanation: Mitochondria produce ATP."
    )
  );

  bot.command("ping", ctx => ctx.reply("البوت يعمل بنجاح ✅"));

  bot.on("message:text", async ctx => {
    const message = ctx.message.text;
    if (message.startsWith("/")) return;

    const questions = parseQuestions(message);

    if (!questions.length) {
      return ctx.reply("لم أتمكن من استخراج الأسئلة. تأكد من وضع الاختيارات والإجابة الصحيحة ✅");
    }

    await ctx.reply(`وجدت ${questions.length} سؤالاً. جاري إنشاء الاستفتاءات...`);

    let success = 0;
    let failed = 0;

    for (const q of questions) {
      try {
        await ctx.api.sendPoll(
          ctx.chat.id,
          q.title.slice(0, 300),
          q.options.map(o => o.text.slice(0, 100)),
          {
            type: "quiz",
            correct_option_id: q.correct,
            explanation: q.explanation.slice(0, 200) || undefined,
            is_anonymous: true
          }
        );

        success++;
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error("Poll error:", error);
        failed++;
      }
    }

    await ctx.reply(`انتهى النشر ✅\nنجح: ${success}\nفشل: ${failed}`);
  });
        }
