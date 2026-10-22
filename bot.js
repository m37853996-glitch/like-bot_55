const { Telegraf, Markup } = require("telegraf");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const bot = new Telegraf("8841897939:AAF-dkSV_FCq2dUGSn8ScdrVbnoThBRPdgg");
const dbPath = path.join(__dirname, "cooldowns.json");
const dataPath = path.join(__dirname, "bot_data.json");
const accountsPath = path.join(__dirname, "accounts.txt");

let userLikeCooldowns = fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath, "utf8")) : {};
function saveCooldowns() { fs.writeFileSync(dbPath, JSON.stringify(userLikeCooldowns, null, 2)); }

let botData = {
  activeUsers: ["8988529781"],
  activeGroups: ["-1004308451962"],
  disabledGroups: [],
  admins: ["8988529781"],
  userGroups: {},
  notifiedUsers: [],
  groupExpiry: {},
  userExpiry: {},
  codes: {},
  groupDailyCooldowns: {}
};

if (fs.existsSync(dataPath)) {
  try {
    const loaded = JSON.parse(fs.readFileSync(dataPath, "utf8"));
    if (loaded.activeUsers) botData.activeUsers = loaded.activeUsers;
    if (loaded.activeGroups) botData.activeGroups = loaded.activeGroups;
    if (loaded.disabledGroups) botData.disabledGroups = loaded.disabledGroups;
    if (loaded.admins) botData.admins = loaded.admins;
    if (loaded.userGroups) botData.userGroups = loaded.userGroups;
    if (loaded.notifiedUsers) botData.notifiedUsers = loaded.notifiedUsers;
    if (loaded.groupExpiry) botData.groupExpiry = loaded.groupExpiry;
    if (loaded.userExpiry) botData.userExpiry = loaded.userExpiry;
    if (loaded.codes) botData.codes = loaded.codes;
    if (loaded.groupDailyCooldowns) botData.groupDailyCooldowns = loaded.groupDailyCooldowns;
  } catch (e) {}
}

function saveData() { fs.writeFileSync(dataPath, JSON.stringify(botData, null, 2)); }
const isAdmin = (id) => botData.admins.includes(id.toString());
const DEVELOPER_ID = "8988529781";

function getAccounts() {
  if (!fs.existsSync(accountsPath)) return [];
  const data = fs.readFileSync(accountsPath, "utf8");
  return data.split("\n").map(acc => acc.trim()).filter(acc => acc.length > 0);
}

function isUserActive(userId) {
  if (isAdmin(userId)) return true;
  if (!botData.activeUsers.includes(userId)) return false;
  const expiry = botData.userExpiry[userId];
  if (expiry && expiry < Date.now()) {
    return false;
  }
  return true;
}

function isGroupActive(chatId) {
  if (!botData.activeGroups.includes(chatId)) return false;
  const expiry = botData.groupExpiry[chatId];
  if (expiry) {
    if (expiry < Date.now()) {
      const idx = botData.activeGroups.indexOf(chatId);
      if (idx !== -1) botData.activeGroups.splice(idx, 1);
      const dIdx = botData.disabledGroups.indexOf(chatId);
      if (dIdx !== -1) botData.disabledGroups.splice(dIdx, 1);
      delete botData.groupExpiry[chatId];
      saveData();
      return false;
    }
  }
  return true;
}

async function isGroupAdmin(ctx) {
  try {
    const m = await ctx.telegram.getChatMember(ctx.chat.id, ctx.from.id);
    return m.status === 'creator' || m.status === 'administrator';
  } catch (e) { return false; }
}

bot.telegram.setMyCommands([
  { command: 'start', description: 'تشغيل البوت / عرض القائمة' },
  { command: 'id', description: 'معرفة الآيدي' }
]);

bot.start(async (ctx) => {
  const userId = ctx.from.id.toString();
  const chatId = ctx.chat.id.toString();
  const chatType = ctx.chat.type;
  const userName = ctx.from.first_name || "مستخدم";
  const startImg = "https://i.postimg.cc/HjGfMjSY/dcfd304bbad41cf055f2c9031a8d04c8.jpg";

  if (chatType === 'private' && userId !== DEVELOPER_ID) {
    if (!botData.notifiedUsers.includes(userId)) {
      botData.notifiedUsers.push(userId);
      saveData();
      bot.telegram.sendMessage(
        DEVELOPER_ID,
        `🚨 **شخص جديد دخل إلى البوت!**\n\n` +
        `👤 **الاسم:** ${userName}\n` +
        `🆔 **الآيدي:** \`${userId}\``,
        { parse_mode: "Markdown" }
      ).catch(() => {});
    }
  }

  if (chatType === 'supergroup' || chatType === 'group' || chatType === 'channel') {
    if (!isGroupActive(chatId) && !isAdmin(userId)) {
      return ctx.replyWithMarkdown("❌ **انتهت صلاحية اشتراك هذه المجموعة!**\n\n🔹 للتجديد تواصل: @m4kk6", Markup.inlineKeyboard([[Markup.button.url("💬 التواصل", "https://t.me/m4kk6")]]));
    }
    if (botData.disabledGroups.includes(chatId)) {
      return ctx.reply("💤 البوت متوقف حالياً في هذه المجموعة. يمكن لأدمن القروب إرسال /on لتشغيله.");
    }

    let grpTxt = "🤖 **LIKE BOT**\n\n" +
                 "╭───────────────╮\n" +
                 "📌 **قائمة الأوامر**\n" +
                 "╰───────────────╯\n\n" +
                 "🎯 **أوامر المجموعة**\n\n" +
                 "/like `<uid>`\n↳ إرسال اللايكات\n\n" +
                 "/on\n↳ تشغيل البوت في المجموعة\n\n" +
                 "/off\n↳ إيقاف البوت في المجموعة\n\n" +
                 "━━━━━━━━━━━━━━\n\n" +
                 "💳 Credit: @m4kk6";

    return ctx.replyWithPhoto(startImg, { caption: grpTxt, parse_mode: "Markdown" }).catch(() => ctx.replyWithMarkdown(grpTxt));
  }

  if (chatType === 'private') {
    if (isUserActive(userId)) {
      let txt = "🤖 **LIKE BOT**\n\n" +
                "╭───────────────╮\n" +
                "📌 **قائمة الأوامر**\n" +
                "╰───────────────╯\n\n" +
                "🎯 **أوامر المستخدمين**\n\n" +
                "/like `<uid>`\n↳ إرسال اللايكات\n\n" +
                "/likeauto\n↳ تفعيل الأوتو لايك\n\n" +
                "/removeauto\n↳ إيقاف الأوتو لايك\n\n" +
                "/groups\n↳ عرض القروبات المفعّلة\n\n";

      if (isAdmin(userId)) {
        txt += "━━━━━━━━━━━━━━\n\n" +
               "⚙️ **أوامر الإدارة**\n\n" +
               "/adduser `<id>`\n↳ تفعيل مستخدم\n\n" +
               "/remuser `<id>`\n↳ إزالة مستخدم\n\n" +
               "/addgroup `<group_id>` `<user_id>` `<days>`\n↳ تفعيل قروب\n\n" +
               "/remgroup `<group_id>` `<user_id>`\n↳ إزالة قروب\n\n" +
               "/gencode `<مدة>`\n↳ توليد كود اشتراك\n\n" +
               "/codes\n↳ عرض الأكواد ومَن استخدمها\n\n" +
               "/broadcast `<msg>`\n↳ إرسال رسالة للجميع\n\n" +
               "/addadmin `<id>`\n↳ إضافة أدمن\n\n" +
               "/remadmin `<id>`\n↳ إزالة أدمن\n\n" +
               "/users\n↳ عرض الحسابات المفعّلة\n\n";
      }

      txt += "━━━━━━━━━━━━━━\n\n" +
             "💳 Credit: @m4kk6";
      
      return ctx.replyWithPhoto(startImg, { caption: txt, parse_mode: "Markdown" }).catch(() => ctx.replyWithMarkdown(txt));
    }
    
    let buyTxt = "🤖 **LIKE BOT**\n\n" +
                 "╭───────────────╮\n" +
                 "💎 **هذا البوت مدفوع**\n" +
                 "╰───────────────╯\n\n" +
                 "للاشتراك أو الاستفسار عن الأسعار، تواصل معي:\n" +
                 "👤 @m4kk6\n\n" +
                 "🎟️ **عندك كود اشتراك؟**\n" +
                 "اضغط على الزر أدناه لإدخال الكود الخاص بك وفتح البوت والاستمتاع بجميع المميزات.\n\n" +
                 "━━━━━━━━━━━━━━\n\n" +
                 "💳 Credit: @m4kk6";

    return ctx.replyWithPhoto(startImg, {
      caption: buyTxt,
      parse_mode: "Markdown",
      ...Markup.inlineKeyboard([
        [Markup.button.callback("🎟️ إدخال كود الاشتراك", "enter_code")],
        [Markup.button.url("💬 التواصل مع المطور", "https://t.me/m4kk6")]
      ])
    }).catch(() => {});
  }
});

bot.action("enter_code", async (ctx) => {
  await ctx.answerCbQuery();
  return ctx.replyWithMarkdown("🎟️ **يرجى إرسال كود التفعيل الخاص بك الآن (مثال: `MICHAEL-XXXXXX`):**");
});

async function processRedeem(ctx, codeText) {
  const code = codeText.trim();
  if (!botData.codes[code]) return ctx.reply("❌ الكود غير صحيح أو غير موجود.");
  if (botData.codes[code].used) return ctx.reply("❌ تم استخدام هذا الكود مسبقاً.");

  const userId = ctx.from.id.toString();
  const userName = ctx.from.first_name || "مستخدم";
  const codeData = botData.codes[code];
  
  codeData.used = true;
  codeData.usedBy = userId;
  codeData.usedByName = userName;

  const now = Date.now();
  const currentExpiry = (botData.userExpiry[userId] && botData.userExpiry[userId] > now) ? botData.userExpiry[userId] : now;
  const newExpiry = currentExpiry + codeData.durationMs;

  botData.userExpiry[userId] = newExpiry;
  if (!botData.activeUsers.includes(userId)) {
    botData.activeUsers.push(userId);
  }
  saveData();

  bot.telegram.sendMessage(
    DEVELOPER_ID,
    `🎟️ **تم استخدام كود تفعيل بنجاح!**\n\n` +
    `👤 **المستخدم:** ${userName}\n` +
    `🆔 **الآيدي:** \`${userId}\`\n` +
    `🔑 **الكود:** \`${code}\``,
    { parse_mode: "Markdown" }
  ).catch(() => {});

  const expiryDateStr = new Date(newExpiry).toLocaleString();
  return ctx.replyWithMarkdown(`🎉 **مبروك! تم تفعيل اشتراكك في الخاص بنجاح.**\n\n⏳ **ينتهي الاشتراك في:** ${expiryDateStr}\n💡 يمكنك الآن استخدام البوت بكامل الميزات عبر إرسال /start.`);
}

bot.command("redeem", async (ctx) => {
  if (ctx.chat.type !== 'private') return ctx.reply("⚠️ استخدم هذا الأمر في خاص البوت فقط.");
  const parts = ctx.message.text.split(" ");
  const code = parts[1];
  if (!code) return ctx.replyWithMarkdown("⚠️ **الاستخدام الصحيح:**\n`/redeem <code>`");
  return processRedeem(ctx, code);
});

bot.on("text", async (ctx, next) => {
  if (ctx.chat.type === 'private' && !isUserActive(ctx.from.id.toString())) {
    const text = ctx.message.text;
    if (text.startsWith("MICHAEL-") || botData.codes[text.trim()]) {
      return processRedeem(ctx, text);
    }
  }
  return next();
});

bot.command("gencode", (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply("❌ للإدارة فقط.");
  const parts = ctx.message.text.split(" ");
  const durationArg = parts[1] || "1d";

  let ms = 24 * 60 * 60 * 1000;
  let durationDesc = "1 يوم";

  if (durationArg.endsWith('m')) {
    const mins = parseInt(durationArg) || 1;
    ms = mins * 60 * 1000;
    durationDesc = `${mins} دقائق`;
  } else if (durationArg.endsWith('h')) {
    const hours = parseInt(durationArg) || 1;
    ms = hours * 60 * 60 * 1000;
    durationDesc = `${hours} ساعات`;
  } else if (durationArg.endsWith('d') || !isNaN(durationArg)) {
    const days = parseInt(durationArg) || 1;
    ms = days * 24 * 60 * 60 * 1000;
    durationDesc = `${days} أيام`;
  }

  const code = "MICHAEL-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  botData.codes[code] = { 
    durationMs: ms, 
    durationDesc: durationDesc, 
    used: false, 
    usedBy: null, 
    usedByName: null 
  };
  saveData();

  return ctx.replyWithMarkdown(
    `✅ **تم توليد كود التفعيل بنجاح:**\n\n` +
    `🔑 الكود: \`${code}\`\n` +
    `⏳ المدة: ${durationDesc}\n\n` +
    `💡 يمكن للمستخدم تفعيله بإرسال:\n` +
    `\`/redeem ${code}\``
  );
});

bot.command("codes", (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply("❌ للإدارة فقط.");
  const codeKeys = Object.keys(botData.codes);
  if (codeKeys.length === 0) return ctx.reply("📌 لا توجد أي أكواد مسجلة حالياً.");

  let txt = "📋 **قائمة الكودات المولدة وحالتها:**\n\n";
  for (const code of codeKeys) {
    const c = botData.codes[code];
    txt += `🔑 الكود: \`${code}\`\n`;
    txt += `⏳ المدة: ${c.durationDesc}\n`;
    if (c.used) {
      txt += `🔴 الحالة: **مستعمل**\n`;
      txt += `👤 بواسطة: ${c.usedByName} (\`${c.usedBy}\`)\n`;
    } else {
      txt += `🟢 الحالة: **غير مستعمل**\n`;
    }
    txt += `-------------------\n`;
  }
  return ctx.replyWithMarkdown(txt);
});

bot.command("broadcast", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply("❌ للإدارة فقط.");
  const msg = ctx.message.text.split(" ").slice(1).join(" ");
  if (!msg) return ctx.replyWithMarkdown("⚠️ **الاستخدام الصحيح:**\n`/broadcast <الرسالة المراد إرسالها>`");

  let successCount = 0;
  for (const uId of botData.activeUsers) {
    try {
      await ctx.telegram.sendMessage(uId, `📢 **إعلان من الإدارة:**\n\n${msg}`, { parse_mode: "Markdown" });
      successCount++;
    } catch (e) {}
  }
  for (const gId of botData.activeGroups) {
    try {
      await ctx.telegram.sendMessage(gId, `📢 **إعلان من الإدارة:**\n\n${msg}`, { parse_mode: "Markdown" });
      successCount++;
    } catch (e) {}
  }
  return ctx.reply(`✅ تم إرسال الإذاعة بنجاح إلى (${successCount}) جهة.`);
});

bot.command("on", async (ctx) => {
  if (ctx.chat.type === 'private') return ctx.reply("⚠️ خاص بالمجموعات المصرحة فقط.");
  const chatId = ctx.chat.id.toString();
  if (!isGroupActive(chatId)) return ctx.reply("❌ انتهت صلاحية اشتراك هذه المجموعة.");
  if (!await isGroupAdmin(ctx) && !isAdmin(ctx.from.id)) return ctx.reply("❌ مخصص لأدمنة (مشرفي) هذه المجموعة فقط.");
  const idx = botData.disabledGroups.indexOf(chatId);
  if (idx !== -1) { botData.disabledGroups.splice(idx, 1); saveData(); }
  return ctx.reply("🟢 تم تشغيل البوت في المجموعة بنجاح!");
});

bot.command("off", async (ctx) => {
  if (ctx.chat.type === 'private') return ctx.reply("⚠️ خاص بالمجموعات المصرحة فقط.");
  const chatId = ctx.chat.id.toString();
  if (!isGroupActive(chatId)) return ctx.reply("❌ انتهت صلاحية اشتراك هذه المجموعة.");
  if (!await isGroupAdmin(ctx) && !isAdmin(ctx.from.id)) return ctx.reply("❌ مخصص لأدمنة (مشرفي) هذه المجموعة فقط.");
  if (!botData.disabledGroups.includes(chatId)) { botData.disabledGroups.push(chatId); saveData(); }
  return ctx.reply("🔴 تم إيقاف البوت في المجموعة مؤقتاً. لتشغيله يرسل أحد المشرفين /on");
});

bot.command("like", async (ctx) => {
  const userId = ctx.from.id.toString();
  const chatId = ctx.chat.id.toString();
  const chatType = ctx.chat.type;

  if (chatType === 'private' && !isUserActive(userId)) {
    return ctx.reply("❌ المحادثة الخاصة مخصصة للمشتركين فقط. البوت مدفوع!");
  }

  if (chatType !== 'private') {
    if (!isGroupActive(chatId) && !isAdmin(userId)) {
      return ctx.replyWithMarkdown("❌ **انتهت صلاحية اشتراك هذه المجموعة!**\n\n🔹 للتجديد تواصل: @m4kk6", Markup.inlineKeyboard([[Markup.button.url("💬 التواصل", "https://t.me/m4kk6")]]));
    }
    if (botData.disabledGroups.includes(chatId)) return ctx.reply("💤 البوت متوقف حالياً في هذه المجموعة من قِبل المشرفين.");
  }

  const parts = ctx.message.text.split(" ");
  const targetUid = parts[1];
  if (!targetUid) return ctx.reply("⚠️ الاستخدام الصحيح:\n/like <uid>");

  const waitMsg = await ctx.reply(`⏳ جاري جلب البيانات وإرسال اللايكات (${targetUid})...`);

  try {
    const infoRes = await axios.get("http://de26.spaceify.eu:26080/info", { params: { uid: targetUid }, timeout: 15000 });
    
    await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});

    if (infoRes && infoRes.data && infoRes.data.basicInfo) {
      const basic = infoRes.data.basicInfo;
      
      // تأمين الاسم ومنع أخطاء الرموز الخاصة مثل الشرطة السفلى _
      const rawNickname = basic.nickname || "غير معروف";
      const nickname = rawNickname.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');

      const beforeLikes = basic.liked || 0;
      const afterLikes = beforeLikes; 
      const addedLikes = afterLikes - beforeLikes;

      const res = `🎮 **LIKE REPORT**\n\n` +
                  `👤 **الاسم:** ${nickname}\n` +
                  `🔹 **اللايكات قبل:** ${beforeLikes}\n` +
                  `❤️ **اللايكات بعد:** ${afterLikes}\n` +
                  `➕ **+Likes:** +${addedLikes}\n\n` +
                  `━━━━━━━━━━━━━━\n\n` +
                  `💳 Credit: @m4kk6`;

      const resImg = chatType === 'private' ? "https://i.postimg.cc/nV5s5Zjb/faf0dd7d9902836b17f25863e3927b1a.jpg" : "https://i.postimg.cc/65ndfTjQ/fbaf9f7064c9fce74d65d54f0e039f13.jpg";
      
      return ctx.replyWithPhoto(resImg, { caption: res, parse_mode: "Markdown" }).catch(() => ctx.replyWithMarkdown(res));
    } else {
      return ctx.reply("❌ لم يتم العثور على بيانات لهذا الآيدي.");
    }

  } catch (err) {
    await ctx.telegram.deleteMessage(ctx.chat.id, waitMsg.message_id).catch(() => {});
    return ctx.reply(`⚠️ **عذراً، السيرفر بطيء أو لا يستجيب حالياً.**\nيرجى المحاولة مرة أخرى بعد قليل.`);
  }
});

bot.command("likeauto", (ctx) => {
  if (ctx.chat.type !== 'private') return ctx.reply("⚠️ أمر تفعيل الأوتو لايك مخصص للاستخدام في المحادثة الخاصة مع البوت فقط.");
  
  const parts = ctx.message.text.split(" ");
  const uid = parts[1];
  const days = parseInt(parts[2]);

  if (!uid || isNaN(days)) {
    return ctx.replyWithMarkdown(
      "🤖 **شرح استخدام أمر أوتو لايك (Auto Like):**\n\n" +
      "📌 **الوظيفة:** تفعيل إرسال **220 لايك** يومياً بشكل تلقائي للاعب.\n\n" +
      "⚙️ **طريقة الاستخدام:**\n`/likeauto <uid> <days>`\n\n" +
      "📝 **مثال:**\n`/likeauto 123456789 5`"
    );
  }

  if (days < 2 || days > 10) {
    return ctx.reply("❌ عذراً، عدد الأيام غير مسموح به (الحد الأدنى 2 يوم، والحد الأقصى 10 أيام).");
  }

  return ctx.replyWithMarkdown(`✅ تم تفعيل الأوتو لايك (220 لايك يومياً) للاعب (\`${uid}\`) لمدة (${days} أيام) بنجاح.`);
});

bot.command("removeauto", (ctx) => {
  if (ctx.chat.type !== 'private') return ctx.reply("⚠️ أمر إيقاف الأوتو لايك مخصص للاستخدام في المحادثة الخاصة مع البوت فقط.");

  const parts = ctx.message.text.split(" ");
  const uid = parts[1];

  if (!uid) {
    return ctx.replyWithMarkdown(
      "🗑️ **شرح استخدام أمر إيقاف أوتو لايك:**\n\n" +
      "⚙️ **طريقة الاستخدام:**\n`/removeauto <uid>`\n\n" +
      "📝 **مثال:**\n`/removeauto 123456789`"
    );
  }

  return ctx.replyWithMarkdown(`✅ تم إيقاف وإزالة الأوتو لايك للاعب (\`${uid}\`) بنجاح.`);
});

bot.command("adduser", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply("❌ للإدارة فقط.");
  const uId = ctx.message.text.split(" ")[1];
  if (!uId) return ctx.reply("⚠️ /adduser <ID>");
  if (!botData.activeUsers.includes(uId)) { botData.activeUsers.push(uId); saveData(); }
  await ctx.telegram.sendMessage(uId, "🎉 تم تفعيل حسابك في بوت اللايكات (خاص).", { parse_mode: "Markdown" }).catch(() => {});
  return ctx.replyWithMarkdown(`✅ تم تفعيل المستخدم (\`${uId}\`) في الخاص وإبلاغه.`);
});

bot.command("remuser", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply("❌ للإدارة فقط.");
  const uId = ctx.message.text.split(" ")[1];
  if (!uId) return ctx.reply("⚠️ /remuser <ID>");
  const idx = botData.activeUsers.indexOf(uId);
  if (idx !== -1) { botData.activeUsers.splice(idx, 1); saveData(); }
  await ctx.telegram.sendMessage(uId, "⚠️ تم إزالة تفعيل حسابك من الخاص.", { parse_mode: "Markdown" }).catch(() => {});
  return ctx.replyWithMarkdown(`✅ تم إزالة تفعيل المستخدم (\`${uId}\`).`);
});

bot.command("addgroup", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply("❌ للإدارة فقط.");
  const parts = ctx.message.text.split(" ");
  const gId = parts[1];
  const uId = parts[2];
  const days = parseInt(parts[3]) || 30;

  if (!gId) return ctx.replyWithMarkdown("⚠️ **الاستخدام الصحيح:**\n`/addgroup <group_id> [user_id] [days]`");

  if (!botData.activeGroups.includes(gId)) { 
    botData.activeGroups.push(gId); 
  }

  const expiryTime = Date.now() + (days * 24 * 60 * 60 * 1000);
  botData.groupExpiry[gId] = expiryTime;

  if (uId) {
    if (!botData.userGroups[uId]) botData.userGroups[uId] = [];
    if (!botData.userGroups[uId].includes(gId)) botData.userGroups[uId].push(gId);
  }
  
  saveData();

  let notifyStatus = "";
  if (uId) {
    try {
      await ctx.telegram.sendMessage(
        uId,
        `🎉 **مبروك! تم تفعيل مجموعتك بنجاح.**\n\n🆔 **آيدي المجموعة:** \`${gId}\`\n⏳ **مدة التفعيل:** ${days} يوم\n\n💡 يمكنك الآن استخدام البوت داخل المجموعة بكل سهولة.`,
        { parse_mode: "Markdown" }
      );
      notifyStatus = `\n📩 **تم إرسال إشعار التفعيل إلى خاص المستخدم (\`${uId}\`) بنجاح!**`;
    } catch (err) {
      notifyStatus = `\n⚠️ **تعذر إرسال إشعار لخاص المستخدم (\`${uId}\`)**.`;
    }
  }

  return ctx.replyWithMarkdown(`✅ **تم تفعيل القروب (\`${gId}\`) لمدة ${days} يوم بنجاح!**${notifyStatus}`);
});

bot.command("remgroup", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply("❌ للإدارة فقط.");
  const parts = ctx.message.text.split(" ");
  const gId = parts[1];
  const uId = parts[2];

  if (!gId) return ctx.replyWithMarkdown("⚠️ **الاستخدام الصحيح:**\n`/remgroup <group_id> [user_id]`");

  const idx = botData.activeGroups.indexOf(gId);
  if (idx !== -1) { 
    botData.activeGroups.splice(idx, 1); 
    const dIdx = botData.disabledGroups.indexOf(gId);
    if (dIdx !== -1) botData.disabledGroups.splice(dIdx, 1);
    delete botData.groupExpiry[gId];

    if (uId && botData.userGroups[uId]) {
      const gIdx = botData.userGroups[uId].indexOf(gId);
      if (gIdx !== -1) botData.userGroups[uId].splice(gIdx, 1);
    }

    saveData(); 

    let notifyStatus = "";
    if (uId) {
      try {
        await ctx.telegram.sendMessage(
          uId,
          `🔴 **تنبيه: تم إلغاء تفعيل مجموعتك.**\n\n🆔 **آيدي المجموعة:** \`${gId}\``,
          { parse_mode: "Markdown" }
        );
        notifyStatus = `\n📩 **تم إرسال إشعار الإزالة لخاص المستخدم (\`${uId}\`)!**`;
      } catch (err) {
        notifyStatus = `\n⚠️ **تعذر إرسال إشعار لخاص المستخدم (\`${uId}\`)**.`;
      }
    }

    return ctx.replyWithMarkdown(`🔴 **تم إزالة القروب (\`${gId}\`) بنجاح!**${notifyStatus}`); 
  }
  return ctx.replyWithMarkdown(`⚠️ القروب (\`${gId}\`) غير موجود.`);
});

bot.command("addadmin", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply("❌ للإدارة فقط.");
  const uId = ctx.message.text.split(" ")[1];
  if (!uId) return ctx.reply("⚠️ /addadmin <ID>");
  if (!botData.admins.includes(uId)) { botData.admins.push(uId); saveData(); }
  await ctx.telegram.sendMessage(uId, "🛡️ تم ترقيتك لتصبح أدمن.", { parse_mode: "Markdown" }).catch(() => {});
  return ctx.replyWithMarkdown(`✅ تم إضافة الأدمن (\`${uId}\`).`);
});

bot.command("remadmin", async (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply("❌ للإدارة فقط.");
  const uId = ctx.message.text.split(" ")[1];
  if (!uId) return ctx.reply("⚠️ /remadmin <ID>");
  const idx = botData.admins.indexOf(uId);
  if (idx !== -1 && uId !== "8988529781") {
    botData.admins.splice(idx, 1);
    
    let removedGroupsCount = 0;
    if (botData.userGroups[uId]) {
      const userGrps = botData.userGroups[uId];
      for (const gId of userGrps) {
        const gIdx = botData.activeGroups.indexOf(gId);
        if (gIdx !== -1) {
          botData.activeGroups.splice(gIdx, 1);
          removedGroupsCount++;
        }
        const dIdx = botData.disabledGroups.indexOf(gId);
        if (dIdx !== -1) botData.disabledGroups.splice(dIdx, 1);
        delete botData.groupExpiry[gId];
      }
      delete botData.userGroups[uId];
    }

    saveData();
    await ctx.telegram.sendMessage(uId, "⚠️ تم سحب صلاحيات الإدارة منك وإلغاء تفعيل مجموعاتك.", { parse_mode: "Markdown" }).catch(() => {});
    return ctx.replyWithMarkdown(`✅ تم إزالة الأدمن (\`${uId}\`) وإلغاء تفعيل وحذف (${removedGroupsCount}) من مجموعاته المرتبطة تلقائياً.`);
  }
  return ctx.reply("❌ لا يمكنك إزالة هذا الأدمن.");
});

bot.command("groups", (ctx) => {
  const userId = ctx.from.id.toString();
  const myGroups = botData.userGroups[userId] || [];
  if (!myGroups.length) return ctx.reply("📌 ليس لديك مجموعات مفعلة خاصة بك.");
  
  let txt = "📋 **مجموعاتك المفعلة والوقت المتبقي:**\n\n";
  for (const gId of myGroups) {
    const expiry = botData.groupExpiry[gId];
    if (expiry) {
      const rem = expiry - Date.now();
      if (rem > 0) {
        const daysLeft = Math.floor(rem / (1000 * 60 * 60 * 24));
        const hoursLeft = Math.floor((rem % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        txt += `• القروب: \`${gId}\`\n  ⏳ متبقي: ${daysLeft} يوم و ${hoursLeft} ساعة\n\n`;
      } else {
        txt += `• القروب: \`${gId}\`\n  ❌ **منتهي الصلاحية**\n\n`;
      }
    } else {
      txt += `• القروب: \`${gId}\` (دائم)\n\n`;
    }
  }
  return ctx.replyWithMarkdown(txt);
});

bot.command("users", (ctx) => {
  if (!isAdmin(ctx.from.id)) return ctx.reply("❌ للإدارة فقط.");
  const accountsCount = getAccounts().length;
  return ctx.replyWithMarkdown(`📊 **حالة النظام والبيانات:**\n\n👤 **المستخدمين المفعلين:** ${botData.activeUsers.length}\n🤖 **عدد الحسابات (accounts.txt):** ${accountsCount}\n👥 **المجموعات المفعلة:** ${botData.activeGroups.length}\n💤 **المتوقفة مؤقتاً:** ${botData.disabledGroups.length}\n🛡️ **الأدمن:** ${botData.admins.length}`);
});

bot.command("id", (ctx) => ctx.replyWithMarkdown(`👤 **الاسم:** ${ctx.from.first_name}\n• آيدي: \`${ctx.from.id}\`\n• آيدي الدردشة: \`${ctx.chat.id}\``));

bot.launch().then(() => console.log("Bot running successfully on Render!")).catch(console.error);
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
