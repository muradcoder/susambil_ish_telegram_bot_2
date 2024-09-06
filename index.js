const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
import dotenv from "dotenv";

// Telegram bot uchun API tokeningizni kiriting
const token = 'BOT_TOKEN';  // Telegram bot API tokeningiz
const bot = new TelegramBot(token, { polling: true });

// Kanal ID yoki @username
const channelUsername = '@susambil_ish';  // O'z kanal username-ni kiriting

// JSON ma'lumotlari saqlanadigan URL
const dataUrl = 'DATA_URL';

// jobId bo'yicha qidiruvlar sonini hisoblash uchun obyekt
const jobIdTracker = {};

// Start buyrug'iga javob
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    // Kanalga obuna bo'lish tugmasi
    const options = {
        reply_markup: {
            inline_keyboard: [
                [{ text: '📢 Kanalga obuna bo\'lish', url: `https://t.me/${channelUsername.replace('@', '')}` }],
                [{ text: '✅ Tekshirish', callback_data: 'check_subscription' }]
            ]
        }
    };

    bot.sendMessage(chatId, 'Botdan foydalanish uchun kanalga obuna bo\'lishingiz kerak. Obuna bo\'lgach, "Tekshirish" tugmasini bosing.', options);
});

// Foydalanuvchini obuna bo'lganligini tekshirish
bot.on('callback_query', (query) => {
    const chatId = query.message.chat.id;

    if (query.data === 'check_subscription') {
        // Foydalanuvchining obuna bo'lganligini tekshirish
        bot.getChatMember(channelUsername, chatId).then((chatMember) => {
            if (chatMember.status === 'member' || chatMember.status === 'administrator' || chatMember.status === 'creator') {
                // Obuna bo'lgan
                bot.sendMessage(chatId, 'Rahmat, siz kanalga obuna bo\'ldingiz! Endi botdan foydalanishingiz mumkin.');
            } else {
                // Obuna bo'lmagan
                bot.sendMessage(chatId, 'Siz hali kanalga obuna bo\'lmadingiz. Iltimos, avval kanalga obuna bo\'ling.');
            }
        }).catch((error) => {
            console.error(error);
            bot.sendMessage(chatId, 'Xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko\'ring.');
        });
    }
});

// Foydalanuvchi jobId yuborganda ishlov berish
bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const userJobId = msg.text;

    // Foydalanuvchi obuna bo'lganligini tekshirishdan oldin botdan foydalanishni cheklash
    bot.getChatMember(channelUsername, chatId).then((chatMember) => {
        if (chatMember.status === 'member' || chatMember.status === 'administrator' || chatMember.status === 'creator') {
            // JSON ma'lumotlarini URL orqali olish
            axios.get(dataUrl)
                .then(response => {
                    const data = response.data;

                    // jobId bo'yicha mos keladigan ma'lumotni topish
                    const jobData = data.find(item => item.jobId === userJobId);

                    if (jobData) {
                        // jobId qidiruv sonini oshirish
                        if (jobIdTracker[userJobId]) {
                            jobIdTracker[userJobId]++;
                        } else {
                            jobIdTracker[userJobId] = 1;
                        }

                        // Ma'lumotlar bilan javob qaytarish
                        const message = `
<b>${jobData.titleJob}</b>\n
<b>Maosh:</b> ${jobData.maosh}
<b>Manzil:</b> ${jobData.manzil}
<b>Ish jadvali:</b> ${jobData.ishJadvali}
<b>Tashkilot:</b> ${jobData.tashkilot}
<b>Aloqa uchun:</b> ${jobData.aloqaUchun} ${jobData.pochta}\n
<b>№ ${jobData.jobId} / Ishning ID raqami</b>\n
<b>Batafsil👇</b>\n${jobData.urllink}`;

                        bot.sendPhoto(chatId, jobData.rasmLink, { caption: message, parse_mode: 'HTML' });
                    } else {
                        bot.sendMessage(chatId, 'Ma\'lumot topilmadi!');
                    }
                })
                .catch(error => {
                    console.error('Xato:', error);
                    bot.sendMessage(chatId, 'Ma\'lumotni olishda xatolik yuz berdi.');
                });
        } else {
            bot.sendMessage(chatId, 'Siz hali kanalga obuna bo\'lmadingiz. Iltimos, avval kanalga obuna bo\'ling.');
        }
    }).catch((error) => {
        console.error('Xatolik:', error);
        bot.sendMessage(chatId, 'Xatolik yuz berdi. Iltimos, keyinroq qayta urinib ko\'ring.');
    });
});

// Foydalanuvchi qidirgan jobId larni ko'rish uchun qo'shimcha buyruq
bot.onText(/\/stats/, (msg) => {
    const chatId = msg.chat.id;

    let statsMessage = '<b>Job ID bo\'yicha qidiruvlar statistikasi:</b>\n\n';
    for (const jobId in jobIdTracker) {
        statsMessage += `<b>${jobId}:</b> ${jobIdTracker[jobId]} marta qidirildi.\n`;
    }

    if (Object.keys(jobIdTracker).length === 0) {
        statsMessage = 'Hozircha hech qanday jobId qidirilmagan.';
    }

    bot.sendMessage(chatId, statsMessage, { parse_mode: 'HTML' });
});
