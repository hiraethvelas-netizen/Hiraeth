/** Only an opaque checkout UUID and timestamp are remembered on this device. */
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const AGE_MS=7*24*60*60*1000;
export function checkoutRecoveryKey(userId:string){return "hiraeth:checkout:recovery:"+userId;}
export function saveCheckoutReference(userId:string,id:string){
  if(!UUID.test(userId)||!UUID.test(id))return;
  try{window.localStorage.setItem(checkoutRecoveryKey(userId),JSON.stringify({id,time:Date.now()}));}
  catch{/* Storage unavailable */ }
}
export function clearCheckoutReference(userId:string|null){
  if(!userId||!UUID.test(userId))return;
  try{window.localStorage.removeItem(checkoutRecoveryKey(userId));}catch{/* Storage unavailable */ }
}
export function readCheckoutReference(userId:string):string|null{
  if(!UUID.test(userId))return null;
  try{
    const raw=window.localStorage.getItem(checkoutRecoveryKey(userId));
    if(!raw)return null;
    const saved:unknown=JSON.parse(raw);
    if(!saved||typeof saved!=="object"||Array.isArray(saved))return null;
    const data=saved as Record<string,unknown>;
    if(typeof data.id==="string"&&UUID.test(data.id)&&typeof data.time==="number"&&
      Date.now()-data.time>=0&&Date.now()-data.time<=AGE_MS)return data.id;
    clearCheckoutReference(userId);
  }catch{clearCheckoutReference(userId);}
  return null;
}
type Status="paid"|"paid_attention"|"pending"|"processing"|"rejected"|"awaiting_payment";
export type RestoredCheckout={
  checkout:{id:string;total:number;shipping:number;subtotal:number;discount:number;expires_at:string};
  outcome:{checkoutId:string;status:Status;orderId:string|null;qrCode:string|null;qrCodeBase64:string|null}|null;
  needsReview:boolean;
};
export function restoreCheckout(raw:unknown):RestoredCheckout|null{
  if(!raw||typeof raw!=="object"||Array.isArray(raw))return null;
  const data=raw as Record<string,unknown>;
  const id=data["id"],status=data["status"];
  if(typeof id!=="string"||!UUID.test(id)||!["paid","paid_attention","pending","processing","rejected","awaiting_payment"].includes(String(status)))return null;
  const total=Number(data["total"]),shipping=Number(data["shipping"]),discount=Number(data["discount"]);
  const subtotal=Number(data["subtotal"]??(total-shipping+discount));
  if(![total,shipping,discount,subtotal].every(x=>Number.isFinite(x)&&x>=0)||total<=0)return null;
  const str=(key:string)=>typeof data[key]==="string"?(data[key] as string):null;
  return{
    checkout:{id,total,shipping,discount,subtotal,expires_at:str("expires_at")??""},
    needsReview:status==="awaiting_payment"||(
      (status==="pending"||status==="processing")&&!str("mp_payment_id")),
    outcome:status==="awaiting_payment"?null:{
      checkoutId:id,status:status as Status,orderId:str("order_id"),
      qrCode:str("pix_qr_code"),qrCodeBase64:str("pix_qr_code_base64"),
    },
  };
}
