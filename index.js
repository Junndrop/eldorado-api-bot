const axios = require("axios");
const { Amplify } = require("aws-amplify");
const { signIn, fetchAuthSession } = require("aws-amplify/auth");

const EMAIL = process.env.ELDO_EMAIL;
const PASSWORD = process.env.ELDO_PASSWORD;

const BOT_KEY = process.env.ELDO_BOT_KEY;

const TG_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

let sentOrders = [];
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

await axios.post(
`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`,
{
chat_id: CHAT_ID,
text:text,
parse_mode:"HTML",
reply_markup: buttons ? {
inline_keyboard: buttons
}:undefined
}
);

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
order.orderOfferDetails?.name ||
order.orderOfferDetails?.gameCategoryTitle ||
"Tidak diketahui";

console.log("ID:",order.id);
console.log("BUYER:",order.buyerUsername);
  console.log("RAW USER REQUEST:");
console.log(
JSON.stringify(
order.userRequestDetails,
null,
2
)
);
const convId = res.data.results?.[0]?.talkJsConversationId;

console.log("CHAT ID:", convId);

console.log(
"https://www.eldorado.gg/api/conversations/" +
convId
);
console.log(order.talkJsConversationId);

console.log("HAS CONVERSATION:");
console.log(!!order.conversationDetails);

  if(order.talkJsConversationId){

try{

const token=await getToken();

const chat=await axios.get(
`https://www.eldorado.gg/api/conversations/${order.talkJsConversationId}`,
{
headers:{
Cookie:`__Host-EldoradoIdToken=${token}`,
Accept:"application/json"
}
}
);

console.log("CHAT OK");
console.log(chat.status);

}catch(err){

console.log("CHAT ERROR:");
console.log(err.response?.status);

}
  }

if(sentOrders.includes(order.id)){
continue;
}

sentOrders.push(order.id);

  await sendTelegram(
`<b>🛒 ORDER MASUK</b>

👤 <b>Buyer</b>
${order.buyerUsername}

📦 <b>Jumlah</b>
${order.purchaseQuantity}

🎁 <b>Item</b>
${itemName}

💵 <b>Total</b>
${order.totalPrice?.amount} ${order.totalPrice?.currency}

🟢 <b>Status</b>
${order.state?.state}

🆔 <b>ID</b>
<code>${order.id}</code>`,
[
[
{text:"✉️ Kirim Pesan Awal",callback_data:`start_${order.id}`}
],
[
{text:"✅ Pesanan Selesai",callback_data:`done_${order.id}`}
]
]
);

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

setInterval(async()=>{

try{

const token=await getToken();

const res=await axios.get(
"https://www.eldorado.gg/api/orders/me/seller/orders",
{
headers:{
"User-Agent":BOT_KEY,
Cookie:`__Host-EldoradoIdToken=${token}`,
Accept:"application/json"
}
}
);

console.log("ORDER DICEK:",res.data.results?.length);

}catch(e){

console.log("ERROR CHAT:",e.message);

}

},15000);

setInterval(async()=>{

try{

const res=await axios.get(
`https://api.telegram.org/bot${TG_TOKEN}/getUpdates?offset=${updateId+1}`
);

const updates=res.data.result;

for(const u of updates){

updateId = u.update_id;

if(!u.callback_query) continue;

const data = u.callback_query.data;
const orderId = data.split("_")[1];

console.log("TOMBOL:",data);
console.log("ORDER ID:",orderId);

if(data.startsWith("start_")){

const token = await getToken();

console.log("KIRIM PESAN AWAL:",orderId);

await axios.post(
`https://www.eldorado.gg/api/orders/${orderId}/messages/send`,
{
message:`Hello! Send your Roblox username and please read the description 🙂

[Bot]`
},
{
headers:{
Cookie:`__Host-EldoradoIdToken=${token}`,
Accept:"application/json"
}
}
);

}

if(data.startsWith("done_")){

try{

const token = await getToken();

console.log("PESANAN SELESAI:",orderId);

await axios.post(
`https://www.eldorado.gg/api/orders/${orderId}/messages/send`,
{
message:`Thank you for your order! I would appreciate it if you left a positive review ⭐`
},
{
headers:{
Cookie:`__Host-EldoradoIdToken=${token}`,
Accept:"application/json"
}
}
);

console.log("BERHASIL");

}catch(err){

console.log("GAGAL:");
console.log("DATA:",err.response?.data);
console.log("STATUS:",err.response?.status);
console.log("MSG:",err.message);

}

}

}

}catch(e){}

},3000);
