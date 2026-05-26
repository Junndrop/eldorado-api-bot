const axios = require("axios");
const { Amplify } = require("aws-amplify");
const { signIn, fetchAuthSession } = require("aws-amplify/auth");

const orderStats = {};
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

async function sendStats(){

let text = "📊 STATISTIK ORDER HARI INI\n\n";

for(let i=0;i<24;i++){

const jam = i.toString().padStart(2,"0");

text += `${jam}:00 = ${orderStats[i] || 0} order\n`;

}

await sendTelegram(text);

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

const itemName =
order.orderOfferDetails?.offerTitle ||
"Unknown Item";

const convId =
order.talkJsConversationId ||
order.talkjsConversationId ||
order.conversationDetails?.id ||
order.talkConversationId ||
null;


if(!processedOrders.has(order.id)){

processedOrders.add(order.id);
  const jam = new Date().getHours();

orderStats[jam] =
(orderStats[jam] || 0) + 1;

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
${waktu}`,
[
[
{text:"📊 Statistik",callback_data:"stats"}
],
[
{text:"✅ Pesanan Selesai",callback_data:`done_${order.id}`}
]
]
);

console.log("TELEGRAM TERKIRIM");
}

console.log("ID:",order.id);
console.log("BUYER:",order.buyerUsername);
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

const WebSocket = require("ws");

const ws = new WebSocket(
"wss://app.talkjs.com/api/v0/49mLECOW/socket/websocket?talkjs-client-build=release-01699e0&appId=49mLECOW&authToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlblR5cGUiOiJ1c2VyIiwic3ViIjoiMWUyY2Q4OTktZjMzNC00ZTc2LWE3MjYtYzJhMTVjOThkZjAxIiwiZXhwIjoxNzc5NDg0MDIwLCJpc3MiOiI0OW1MRUNPVyJ9.b5YyVnwPSmuwkaF3qoSWSHRiRIGZy1YFaXa9s0RNgOY&vsn=2.0.0"
);

ws.on("open", () => {
console.log("WS CONNECTED");
});

ws.on("message", async (data) => {

const text = data.toString();

console.log(text);

if(
text.includes("UserMessage") &&
!text.includes('"origin":"web"')
){

console.log("CHAT BUYER MASUK");

await sendTelegram(
`📩 CHAT BUYER BARU`
);

}

});

setInterval(()=>{

const now = new Date();

if(
now.getHours()===0 &&
now.getMinutes()===0
){

sendStats();

}

},60000);
  setInterval(checkTelegramButtons,3000);

  async function checkTelegramButtons(){

try{

const res = await axios.get(
`https://api.telegram.org/bot${TG_TOKEN}/getUpdates?offset=${updateId+1}`
);

const updates = res.data.result || [];

for(const u of updates){

updateId = u.update_id;

const data =
u.callback_query?.data;

if(data==="stats"){

let text = "📊 STATISTIK ORDER HARI INI\n\n";

for(let i=0;i<24;i++){

const jam =
i.toString().padStart(2,"0");

text +=
`${jam}:00 = ${orderStats[i] || 0} order\n`;

}

await sendTelegram(text);

}

}

}catch(err){

console.log("BUTTON ERROR");
console.log(err.message);

}

  }
