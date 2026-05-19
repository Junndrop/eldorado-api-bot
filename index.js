const axios = require("axios");
const { Amplify } = require("aws-amplify");
const { signIn, fetchAuthSession } = require("aws-amplify/auth");

const processedOrders = new Set();
const lastMessageCache = {};

const EMAIL = process.env.ELDO_EMAIL;
const PASSWORD = process.env.ELDO_PASSWORD;

const BOT_KEY = process.env.ELDO_BOT_KEY;

const TG_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

let updateId = 0;

Amplify.configure({
  Auth:{
    Cognito:{
      userPoolId:"us-east-2_MlnzCFgHk",
      userPoolClientId:"1956req5ro9drdtbf5i6kis4la"
    }
  }
});

async function sendTelegram(text,buttons=null){

try{

await axios.post(
`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`,
{
chat_id:CHAT_ID,
text:text,
parse_mode:"HTML",
reply_markup:buttons ? {
inline_keyboard:buttons
}:undefined
},
{
timeout:10000
}
);

}catch(err){

console.log("TELEGRAM GAGAL:");
console.log(err.response?.data);
console.log(err.message);

}

}

async function getToken(){

try{
const session = await fetchAuthSession();

if(session?.tokens?.idToken){
console.log("PAKAI TOKEN LAMA");
return session.tokens.idToken.toString();
}

}catch(e){
console.log("BELUM LOGIN");
}

console.log("LOGIN...");

await signIn({
username: EMAIL,
password: PASSWORD
});

const session = await fetchAuthSession();

console.log("TOKEN OK");

return session.tokens.idToken.toString();

}

async function checkOrders(){

try{

const token = await getToken();

console.log("TOKEN ADA");

const res = await axios.get(
"https://www.eldorado.gg/api/orders/me/seller/orders",
{
headers:{
"User-Agent":BOT_KEY,
"Cookie":
`__Host-EldoradoIdToken=${token}`,
"Accept":"application/json"
}
}
);

const orders=(res.data.results||[]).filter(
x=>![
"Canceled",
"Completed",
"Delivered"
].includes(x.state?.state)
);

console.log("TOTAL:",orders.length);

  for(const order of orders){

if(processedOrders.has(order.id)){
processedOrders.add(order.id);

const itemName =
order.orderOfferDetails?.offerTitle ||
"Unknown Item";

const convId =
order.talkJsConversationId ||
order.talkjsConversationId ||
order.conversationDetails?.id ||
order.talkConversationId ||
null;

console.log("CONV:",convId);
console.log("KIRIM TELEGRAM...");

    const waktu = new Date(
order.createdDate || order.createdAt
).toLocaleString("id-ID",{
timeZone:"Asia/Jakarta"
});
    
await sendTelegram(
`<b>🛒 ORDER MASUK</b>

👤 <b>Buyer</b>
${order.buyerUsername}

🎁 <b>Item</b>
${itemName}

📦 <b>Jumlah</b>
${order.purchaseQuantity}

💵 <b>Total</b>
${order.totalPrice?.amount} ${order.totalPrice?.currency}

🕒 Waktu:
${waktu}

🆔 <code>${order.id}</code>`,
[
[
{text:"✅ Pesanan Selesai",callback_data:`done_${order.id}`}
]
]
);

console.log("TELEGRAM TERKIRIM");
}   
console.log("ID:",order.id);
console.log("BUYER:",order.buyerUsername);

if(!convId){
console.log("CHAT ID TIDAK ADA");
continue;
}

try{

const chatRes = await axios.get(
`https://www.eldorado.gg/api/talkjs/conversations/${convId}`,
{
headers:{
"User-Agent":BOT_KEY,
"Cookie":`__Host-EldoradoIdToken=${token}`,
"Accept":"application/json"
}
}
);

const lastText =
chatRes.data?.lastMessage?.body || "";
console.log("PESAN:",lastText);

if(!lastMessageCache[convId]){

lastMessageCache[convId]=lastText;

}else if(lastMessageCache[convId]!==lastText){

lastMessageCache[convId]=lastText;

const waktu = new Date().toLocaleString("id-ID",{
timeZone:"Asia/Jakarta"
});

await sendTelegram(
`📩 CHAT MASUK

👤 Buyer:
${order.buyerUsername}

🎁 Item:
${itemName}

🕒 Waktu:
${waktu}`
);

console.log("NOTIF CHAT TERKIRIM");
}

}catch(e){

console.log("CEK CHAT GAGAL");
console.log(e.response?.status);
}
  }
}catch(err){

console.log("FULL ERROR:");
console.log(err.response?.data || err);

console.log("MESSAGE:");
console.log(err.message);
}
}

checkOrders();

setInterval(checkOrders,30000);
