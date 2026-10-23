from fastapi.testclient import TestClient
from index import app,entries
client=TestClient(app)
def setup_function(): entries.clear()
def test_health():
 r=client.get('/api/health');assert r.status_code==200 and r.json()['status']=='ok'
def test_food_search():
 r=client.get('/api/foods?q=chicken');assert r.status_code==200 and 'chicken' in r.json()[0]['name'].lower()
def test_macro_math():
 r=client.post('/api/analyze',json={'calories':1000,'protein':50,'carbs':100,'fat':20,'goal_calories':2000,'goal_protein':100,'goal_carbs':200,'goal_fat':40})
 assert r.status_code==200 and r.json()['macro_calories']==780 and r.json()['progress_percent']['calories']==50
def test_create_list_delete():
 r=client.post('/api/entries',json={'name':'Oats','calories':152,'protein':5.3,'carbs':27.1,'fat':2.7,'entry_date':'2026-10-23'});assert r.status_code==200
 row=r.json();assert len(client.get('/api/entries').json())==1
 assert client.delete('/api/entries/'+str(row['id'])).status_code==200
 assert client.get('/api/entries').json()==[]
