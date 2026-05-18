const axios = require("axios");
const { Amplify } = require("aws-amplify");
const { signIn, fetchAuthSession } = require("aws-amplify/auth");

const EMAIL = process.env.ELDO_EMAIL;
const PASSWORD = process.env.ELDO_PASSWORD;

const BOT_KEY = process.env.ELDO_BOT_KEY;

const TG_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

let sentOrders = [];

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
reply_markup: buttons ? {
inline_keyboard: buttons
}:undefined
});

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

const token=await getToken();

const res=await axios.get(
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

const orders = (res.data.results || []).filter(
x => ![
"Canceled",
"Completed",
"Delivered"
].includes(x.state?.state)
);

console.log("TOTAL:", orders.length);
  
for(const order of orders){
  if(sentOrders.includes(order.id)) continue;
  sentOrders.push(order.id);

await sendTelegram(
`🛒 ORDER MASUK

Buyer: ${order.buyerUsername}

Jumlah: ${order.purchaseQuantity}

Total: ${order.totalPrice?.amount} ${order.totalPrice?.currency}

Status: ${order.state?.state}

ID: ${order.id}`,
[
[
{text:"📨 Kirim Pesan Awal",callback_data:`start_${order.id}`}
],
[
{text:"✅ Pesanan Selesai",callback_data:`done_${order.id}`}
]
]
);

}

}catch(err){

console.log("FULL ERROR:");
console.log(err);

console.log("MESSAGE:");
console.log(err.message);

console.log("NAME:");
console.log(err.name);

}

}

checkOrders();

setInterval(checkOrders,30000);
setInterval(async()=>{

try{

const res=await axios.get(
`https://api.telegram.org/bot${TG_TOKEN}/getUpdates`
);

const updates=res.data.result;

for(const u of updates){

if(!u.callback_query) continue;

const data=u.callback_query.data;

console.log("TOMBOL:",data);

if(data.startsWith("start_"))
console.log("KIRIM PESAN AWAL");

if(data.startsWith("done_"))
console.log("PESANAN SELESAI");
}catch(e){}

},3000);
