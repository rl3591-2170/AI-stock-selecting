export async function GET(){
 return Response.json({model:{configured:!!(process.env.LLM_API_KEY&&process.env.LLM_BASE_URL&&process.env.LLM_MODEL),model:process.env.LLM_MODEL||null},fuyao:{configured:!!process.env.HITHINK_FINANCE_API_KEY},ifind:{configured:!!process.env.IFIND_API_TOKEN},note:'配置状态不代表调用成功；实际结果以验证回执为准。'},{headers:{'Cache-Control':'no-store'}});
}
