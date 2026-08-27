import { log } from '../util/log.mjs';
import { beginRunBudget, BudgetError, costReport, openLogicalCall, releaseAttempt, reserveAttempt, settleAttempt, settleUncertainAttempt } from '../control/budget.mjs';
import { resolveRoleRoute } from './router.mjs';
import { buildOpenAiCompatibleChatRequest } from './adapters/openai-compatible-chat.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export class LlmError extends Error {}
export { beginRunBudget, costReport };

export async function chat({ role='engineer', operation=role, credentialLane=null, system, user, images=[], json=false, temperature=0.7, maxTokens=8192 }) {
  const route=resolveRoleRoute({role,operation,credentialLane,requirements:{vision:images.length>0,jsonObject:json,maxOutputTokens:maxTokens}});
  if(!route.provider.apiKey) throw Object.assign(new LlmError(`API key is not configured for provider ${route.provider.id} credential lane ${route.credentialLane}`),{fatal:true});
  const logical=openLogicalCall({role,operation,provider:route.provider.id,model:route.model.id,requestedProvider:route.provider.id,requestedModel:route.model.id,credentialLane:route.credentialLane,modelVersion:route.model.versionLabel,modelAliasKind:route.model.aliasKind,adapter:route.provider.adapter,system,user,images});
  let lastErr; const maxAttempts=6;
  for(let attempt=1;attempt<=maxAttempts;attempt++){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),180000); let reservationId=null,reservationClosed=false;
    try{
      reservationId=reserveAttempt(logical,{transportAttempt:attempt,maxTokens});
      const request=buildOpenAiCompatibleChatRequest({route,system,user,images,json,temperature,maxTokens});
      const res=await fetch(request.url,{method:'POST',headers:request.headers,body:request.body,signal:controller.signal});
      if(!res.ok){const t=await res.text();releaseAttempt(reservationId,{status:`http-${res.status}`,error:t});reservationClosed=true;const err=new LlmError(`HTTP ${res.status}: ${t.slice(0,400)}`);if(res.status===429||res.status>=500)throw err;throw Object.assign(err,{fatal:true});}
      let data;try{data=await res.json();}catch(e){throw new LlmError(`Invalid JSON response: ${e.message}`);}
      const usage=data.usage??{},settled=settleAttempt(reservationId,{usage,providerCostUsd:usage.cost,responseModelId:data.model??null});reservationClosed=true;
      const msg=data.choices?.[0]?.message?.content??'';if(!msg.trim())throw new LlmError('Empty completion');
      const actualModel=settled.responseModelId||data.model||route.model.id;
      log.info(`[llm:${role}/${operation}] provider=${route.provider.id} model=${route.model.id} lane=${route.credentialLane} actual=${actualModel} tokens=${usage.total_tokens??'?'} cost=$${settled.costUsd.toFixed(6)}`);
      return{text:msg,usage,role,operation,requestedProvider:route.provider.id,requestedModel:route.model.id,provider:route.provider.id,model:route.model.id,actualModel,credentialLane:route.credentialLane,modelVersion:actualModel||route.model.versionLabel,costUsd:settled.costUsd};
    }catch(e){lastErr=e;if(reservationId&&!reservationClosed){settleUncertainAttempt(reservationId,e);reservationClosed=true;e.fatal=true;}if(e instanceof BudgetError||e.fatal)throw e;log.warn(`[llm:${role}/${operation}] attempt ${attempt}/${maxAttempts} failed: ${e.message}`);if(attempt<maxAttempts){const wait=e.message.includes('503')||e.message.includes('429')?10000*attempt:1200*attempt*attempt;log.warn(`[llm:${role}/${operation}] retrying in ${Math.round(wait/1000)}s ...`);await sleep(wait);}}finally{clearTimeout(timeout);}
  }
  throw lastErr;
}
