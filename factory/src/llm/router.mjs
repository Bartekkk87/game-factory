import { getModelRecord } from './model-registry.mjs';
import { runtimeProvider } from './provider-registry.mjs';

const ROLE_DEFAULTS = Object.freeze({
  director: Object.freeze({ provider: 'openai', model: 'gpt-5.6-terra' }),
  engineer: Object.freeze({ provider: 'openai', model: 'gpt-5.6-terra' }),
  playtester: Object.freeze({ provider: 'openai', model: 'gpt-5.6-terra' }),
  auditor: Object.freeze({ provider: 'openai', model: 'gpt-5.6-luna' })
});
const PROVIDER_DEFAULT_MODELS = Object.freeze({ openai:'gpt-5.6-terra', deepseek:'deepseek-v4-flash', openrouter:'deepseek/deepseek-chat-v3.1', googleai:'gemini-1.5-flash', huggingface:'meta-llama/Llama-3.3-70B-Instruct' });

export class ModelCapabilityError extends Error {
  constructor(provider,model,capability,detail=''){super(`${provider}:${model} cannot satisfy required capability ${capability}${detail?` (${detail})`:''}`);this.name='ModelCapabilityError';this.provider=provider;this.model=model;this.capability=capability;}
}
const envKeyPart=(value)=>String(value||'').toUpperCase().replace(/[^A-Z0-9]+/g,'_');
function selected(role,operation,explicitCredentialLane=null){
  const roleKey=envKeyPart(role),opKey=envKeyPart(operation),roleDefault=ROLE_DEFAULTS[role]||ROLE_DEFAULTS.engineer;
  const opProvider=process.env[`GF_LLM_PROVIDER_${roleKey}_${opKey}`]?.trim(),roleProvider=process.env[`GF_LLM_PROVIDER_${roleKey}`]?.trim()||process.env[`GF_PROVIDER_${roleKey}`]?.trim(),globalProvider=process.env.GF_LLM_PROVIDER?.trim();
  const provider=(opProvider||roleProvider||globalProvider||roleDefault.provider).toLowerCase();
  const explicitModel=process.env[`GF_MODEL_${roleKey}_${opKey}`]?.trim()||process.env[`GF_MODEL_${roleKey}`]?.trim()||process.env.GF_MODEL?.trim()||null;
  const credentialLane=String(explicitCredentialLane||process.env[`GF_LLM_LANE_${roleKey}_${opKey}`]?.trim()||process.env[`GF_LLM_LANE_${roleKey}`]?.trim()||process.env.GF_LLM_LANE?.trim()||(role==='improvement'?'improvement':'production')).toLowerCase();
  return{provider,explicitModel,roleDefault,credentialLane};
}
function requireCapability(model,name){if(model.capabilities?.[name]!==true)throw new ModelCapabilityError(model.provider,model.id,name);}
export function resolveRoleRoute({role='engineer',operation=role,requirements={},credentialLane=null}={}){
  const choice=selected(role,operation,credentialLane),provider=runtimeProvider(choice.provider,{credentialLane:choice.credentialLane});
  const modelId=choice.explicitModel||(provider.id===choice.roleDefault.provider?choice.roleDefault.model:PROVIDER_DEFAULT_MODELS[provider.id]);
  if(!modelId)throw new Error(`No model configured for provider ${provider.id}`);
  const model=getModelRecord(provider.id,modelId);
  requireCapability(model,'text');requireCapability(model,'chatCompletions');if(requirements.vision)requireCapability(model,'vision');if(requirements.jsonObject)requireCapability(model,'jsonObject');if(requirements.structuredOutputs)requireCapability(model,'structuredOutputs');if(requirements.reasoning)requireCapability(model,'reasoning');
  if(Number.isFinite(Number(requirements.maxOutputTokens))&&Number.isFinite(Number(model.capabilities.maxOutputTokens))&&Number(requirements.maxOutputTokens)>Number(model.capabilities.maxOutputTokens))throw new ModelCapabilityError(provider.id,model.id,'maxOutputTokens',`${requirements.maxOutputTokens} requested > ${model.capabilities.maxOutputTokens}`);
  return{role,operation,credentialLane:provider.credentialLane,provider,model,routeId:`${role}/${operation}:${provider.id}:${model.id}:${provider.credentialLane}`};
}
export function roleDefaultsSnapshot(){return JSON.parse(JSON.stringify(ROLE_DEFAULTS));}
