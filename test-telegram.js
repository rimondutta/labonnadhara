import dotenv from 'dotenv';
dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

console.log("Token:", token ? "Exists" : "Missing");
console.log("Chat ID:", chatId);

const url = `https://api.telegram.org/bot${token}/sendMessage`;

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    chat_id: chatId, chatId,
    text: "Hello bot abhi",
  }),
})
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));
