const axios = require("axios");
const { Amplify } = require("aws-amplify");
const { signIn, fetchAuthSession } = require("aws-amplify/auth");


const orderStats = {};
const dailyOrderStats = {};
const dailyMoneyStats = {};
const orderMoneyStats = {};
const processedOrders = new Set();
const orderStates = {};

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
"https://www.eldorado.gg/api/v1/orders/me/seller/orders",
{
headers:{
"User-Agent":BOT_KEY,
"Cookie":
`__Host-EldoradoIdToken=${token}`,
"Accept":"application/json"
}
}
);

const orders = res.data.results || [];

  if(processedOrders.size===0){

for(const order of orders){

processedOrders.add(order.id);

  orderStates[order.id] =
order.state?.state;
  
  if(processedOrders.size > 5000){

processedOrders.clear();

console.log("CACHE RESET");

  }

}

console.log("WARMUP SELESAI");
return;

  }

console.log("TOTAL:",orders.length);

  for(const order of orders){

    const oldState =
orderStates[order.id];

orderStates[order.id] =
order.state?.state;

const itemName =
order.orderOfferDetails?.offerTitle ||
"Unknown Item";

    const jam = Number(
new Date().toLocaleString(
"id-ID",
{
timeZone:"Asia/Jakarta",
hour:"2-digit",
hour12:false
}
).split(".")[0]
);

    const amount =
Number(order.totalPrice?.amount || 0);
    
    if(
oldState &&
![
"Canceled",
"Cancelled",
"Refunded",
"Failed"
].includes(oldState)
&&
[
"Canceled",
"Cancelled",
"Refunded",
"Failed"
].includes(order.state?.state)
){

orderStats[jam] =
Math.max(0,(orderStats[jam] || 0)-1);

orderMoneyStats[jam] =
Math.max(0,(orderMoneyStats[jam] || 0)-amount);

dailyOrderStats[jam] =
Math.max(0,(dailyOrderStats[jam] || 0)-1);

dailyMoneyStats[jam] =
Math.max(0,(dailyMoneyStats[jam] || 0)-amount);

console.log("ORDER DIBATALKAN");
    }

if(!processedOrders.has(order.id)){

if(
[
"Canceled",
"Cancelled",
"Refunded",
"Failed"
].includes(order.state?.state)
){
continue;
}

  orderStats[jam] =
(orderStats[jam] || 0) + 1;
  dailyOrderStats[jam] =
(dailyOrderStats[jam] || 0) + 1;

processedOrders.add(order.id);

orderMoneyStats[jam] =
(orderMoneyStats[jam] || 0) + amount;
  
  dailyMoneyStats[jam] =
(dailyMoneyStats[jam] || 0) + amount;

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
{text:"🏦 Wallet",callback_data:"wallet"}
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

setInterval(async ()=>{

const now = new Date().toLocaleString(
"id-ID",
{
timeZone:"Asia/Jakarta",
hour:"2-digit",
minute:"2-digit",
hour12:false
}
);

if(now==="00.00"){

let text = "🌙 REKAP HARI INI\n\n";

let totalOrder = 0;
let totalDollar = 0;

for(let i=0;i<24;i++){

const jam =
i.toString().padStart(2,"0");

totalOrder +=
(dailyOrderStats[i] || 0);

totalDollar +=
(dailyMoneyStats[i] || 0);

text +=
`${jam}:00 = ${dailyOrderStats[i] || 0} order | $${(dailyMoneyStats[i] || 0).toFixed(2)}\n`;

}

text += `\n💰 TOTAL HARI INI
${totalOrder} order | $${totalDollar.toFixed(2)}`;

await sendTelegram(text);

for(let i=0;i<24;i++){

dailyOrderStats[i] = 0;
dailyMoneyStats[i] = 0;

}

console.log("DAILY STATS RESET");

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

let text = "📊 STATISTIK ORDER\n\n";

let totalOrder = 0;
let totalDollar = 0;

for(let i=0;i<24;i++){

const jam =
i.toString().padStart(2,"0");

totalOrder += (orderStats[i] || 0);
totalDollar += (orderMoneyStats[i] || 0);

text +=
`${jam}:00 = ${orderStats[i] || 0} order | $${(orderMoneyStats[i] || 0).toFixed(2)}\n`;

}

const wallet =
(totalDollar * 0.85).toFixed(2);

text += `\n💰 TOTAL
${totalOrder} order | $${totalDollar.toFixed(2)}

🏦 WALLET
$${wallet}`;

await sendTelegram(text);

}

if(data==="wallet"){

let totalDollar = 0;

for(let i=0;i<24;i++){

totalDollar +=
(orderMoneyStats[i] || 0);

}

const wallet =
totalDollar * 0.85;

await sendTelegram(
`🏦 WALLET SAAT INI

💵 Gross:
$${totalDollar.toFixed(2)}

💰 Net:
$${wallet.toFixed(2)}`
);

}

}

}catch(err){

console.log("BUTTON ERROR");
console.log(err.message);

}

  }
