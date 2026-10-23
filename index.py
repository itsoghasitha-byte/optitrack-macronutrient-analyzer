import os
from datetime import date,datetime,timezone
from fastapi import FastAPI,HTTPException
from fastapi.responses import HTMLResponse
from pydantic import BaseModel,Field
import httpx
app=FastAPI(title="OptiTrack Macronutrient Analyzer",version="1.0.0")
URL=os.getenv("SUPABASE_URL","").rstrip("/"); KEY=os.getenv("SUPABASE_SERVICE_ROLE_KEY","") or os.getenv("SUPABASE_ANON_KEY",""); TABLE=os.getenv("SUPABASE_TABLE","nutrition_entries")
entries=[]; next_id=1
FOODS=[
{"id":"oats","name":"Rolled oats","serving":"40 g","calories":152,"protein":5.3,"carbs":27.1,"fat":2.7},{"id":"egg","name":"Large egg","serving":"1 egg","calories":72,"protein":6.3,"carbs":.4,"fat":4.8},{"id":"chicken","name":"Chicken breast, cooked","serving":"100 g","calories":165,"protein":31,"carbs":0,"fat":3.6},{"id":"rice","name":"Cooked white rice","serving":"150 g","calories":195,"protein":4,"carbs":42.5,"fat":.4},{"id":"banana","name":"Banana","serving":"1 medium","calories":105,"protein":1.3,"carbs":27,"fat":.4},{"id":"yogurt","name":"Plain Greek yogurt","serving":"170 g","calories":100,"protein":17,"carbs":6,"fat":.7},{"id":"lentils","name":"Cooked lentils","serving":"150 g","calories":174,"protein":13.5,"carbs":30.2,"fat":.6},{"id":"almonds","name":"Almonds","serving":"28 g","calories":164,"protein":6,"carbs":6.1,"fat":14.2},{"id":"bread","name":"Whole-wheat bread","serving":"2 slices","calories":180,"protein":8,"carbs":30,"fat":2.5},{"id":"milk","name":"Low-fat milk","serving":"250 ml","calories":122,"protein":8.2,"carbs":12.2,"fat":4.8}]
class Analyze(BaseModel):
 calories:float=Field(ge=0,le=10000);protein:float=Field(ge=0,le=1000);carbs:float=Field(ge=0,le=2000);fat:float=Field(ge=0,le=1000)
 goal_calories:float=Field(default=2000,gt=0,le=10000);goal_protein:float=Field(default=120,ge=0,le=1000);goal_carbs:float=Field(default=250,ge=0,le=2000);goal_fat:float=Field(default=65,ge=0,le=1000)
class Entry(BaseModel):
 name:str=Field(min_length=1,max_length=100);calories:float=Field(ge=0,le=10000);protein:float=Field(ge=0,le=1000);carbs:float=Field(ge=0,le=2000);fat:float=Field(ge=0,le=1000);entry_date:str=Field(default_factory=lambda:date.today().isoformat())
def db_on():return bool(URL and KEY)
async def db(method,path,**kwargs):
 if not db_on():return None
 h={"apikey":KEY,"Authorization":f"Bearer {KEY}","Content-Type":"application/json","Prefer":"return=representation"}
 async with httpx.AsyncClient(timeout=8) as c:r=await c.request(method,f"{URL}/rest/v1/{path}",headers=h,**kwargs)
 if r.status_code>=400:raise HTTPException(502,"Supabase request failed; check table schema and policies.")
 return r.json() if r.content else []
@app.get("/",response_class=HTMLResponse)
async def home():
 with open(os.path.join(os.path.dirname(__file__),"frontend.html"),encoding="utf-8") as f:return f.read()
@app.get("/api/health")
async def health():return {"status":"ok","service":"optitrack-api","version":"1.0.0","database":"supabase" if db_on() else "demo-memory","persistence":db_on()}
@app.get("/api/foods")
async def foods(q:str=""):
 q=q.lower().strip();return [x for x in FOODS if not q or q in x["name"].lower() or q in x["id"]]
@app.post("/api/analyze")
async def analyze(p:Analyze):
 t={k:getattr(p,k) for k in ("calories","protein","carbs","fat")};g={k:getattr(p,"goal_"+k) for k in t}
 return {"totals":t,"goals":g,"progress_percent":{k:round(t[k]/g[k]*100,1) if g[k] else 0 for k in t},"remaining":{k:round(max(0,g[k]-t[k]),1) for k in t},"macro_calories":round(p.protein*4+p.carbs*4+p.fat*9,1),"calorie_difference":round(p.calories-p.goal_calories,1)}
@app.get("/api/entries")
async def list_entries():
 if db_on():return await db("GET",TABLE,params={"select":"id,name,calories,protein,carbs,fat,entry_date,created_at","order":"created_at.desc","limit":"100"}) or []
 return list(reversed(entries[-100:]))
@app.post("/api/entries")
async def add_entry(p:Entry):
 global next_id
 item=p.model_dump()
 if db_on():
  rows=await db("POST",TABLE,json=item);return rows[0] if rows else item
 item.update(id=next_id,created_at=datetime.now(timezone.utc).isoformat());next_id+=1;entries.append(item);return item
@app.delete("/api/entries/{entry_id}")
async def delete_entry(entry_id:int):
 global entries
 if db_on():await db("DELETE",TABLE,params={"id":f"eq.{entry_id}"});return {"deleted":True,"id":entry_id}
 before=len(entries);entries=[x for x in entries if x["id"]!=entry_id]
 if len(entries)==before:raise HTTPException(404,"Entry not found")
 return {"deleted":True,"id":entry_id}
@app.get("/api/insights")
async def insights():
 rows=await list_entries();n=len(rows)
 return {"count":n,"calories_average":round(sum(float(x["calories"]) for x in rows)/n,1) if n else 0,"protein_average":round(sum(float(x["protein"]) for x in rows)/n,1) if n else 0,"days_tracked":len({str(x.get("entry_date","")) for x in rows}),"insight":"Summaries reflect your logged meals, not medical advice." if n else "Log your first meal to unlock trend summaries."}
