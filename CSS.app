:root{ 
  --bg:#0f0a1a;
  --panel:#1a1230;
  --panel2:#150e28;
  --text:#f0f0f5;
  --muted:#b8a0d8;
  --line:rgba(139,92,246,.25);
  --accent:#8B5CF6;
  --accent-bright:#a78bfa;
  --danger:#ff3366;
  --gold:#FCD34D;
  --radius:16px;
}

*{box-sizing:border-box}

body{
  margin:0;
  font-family:system-ui,-apple-system,"Segoe UI","Noto Sans JP",sans-serif;
  background:var(--bg);
  color:var(--text);
}

header{
  position:sticky;top:0;z-index:10;
  padding:14px 20px 10px;
  background:linear-gradient(to bottom, rgba(32,33,36,.96), rgba(32,33,36,.70));
  backdrop-filter: blur(10px);
  border-bottom:3px solid var(--gold);
  box-shadow: 0 3px 12px rgba(252,211,77,.4);
}
  
.row{display:flex;align-items:center;gap:10px}
.between{justify-content:space-between}
.title{
  font-weight:700;
  letter-spacing:.02em;
  font-size:18px;
}
.crumb{
  margin-top:6px;
  color:var(--muted);
  font-size:12px;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.btn{
  border:1px solid var(--line);
  background:rgba(255,255,255,.04);
  color:var(--text);
  border-radius:14px;
  padding:10px 12px;
  font-weight:650;
  font-size:14px;
  line-height:1;
  user-select:none;
}
.btn:active{transform:translateY(1px)}
.btn.accent{border-color:rgba(139,92,246,.5); background:rgba(139,92,246,.15); color:var(--accent-bright)}
.btn.danger{border-color:rgba(236,72,153,.5); background:rgba(236,72,153,.15); color:var(--danger)}

.btn.icon{padding:10px 12px; min-width:44px; text-align:center}
.pill{
  flex:1;
  display:flex; align-items:center; gap:8px;
  background:rgba(255,255,255,.04);
  border:1px solid var(--line);
  border-radius:16px;
  padding:10px 12px;
  min-width:0;
}
.pill input{
  width:100%;
  border:0; outline:0;
  background:transparent;
  color:var(--text);
font-size:14px;
  min-width:0;
}
main{padding:12px 20px 80px}

.panel{
  background: linear-gradient(to bottom, 
    #2a1a4a 0%, 
    #1a1230 100%);
  border:1px solid rgba(139,92,246,.3);
  border-radius:var(--radius);
  padding:14px;
  margin:12px 0;
  position:relative;
}
.panel::before{
  content:'';
  position:absolute;
  inset:0;
  background:
    linear-gradient(45deg, transparent 45%, rgba(139,92,246,.08) 48%, rgba(139,92,246,.08) 52%, transparent 55%),
    linear-gradient(-45deg, transparent 45%, rgba(139,92,246,.08) 48%, rgba(139,92,246,.08) 52%, transparent 55%);
  pointer-events:none;
  border-radius:var(--radius);
}

.panel h3{
  margin:0 0 10px;
  font-size:13px;
  color:var(--muted);
  font-weight:700;
  letter-spacing:.06em;
}
.item{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  padding:14px 14px;
  border-radius:14px;
  background:rgba(255,255,255,.03);
  border:1px solid var(--line);
  margin:10px 0;
}
.item:active{transform:translateY(1px)}
.left{display:flex;align-items:center;gap:10px;min-width:0}
.ico{font-size:16px; opacity:.9}
.name{
  font-weight:700;
  font-size:15px;
  white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
  min-width:0;
}
.meta{
  display:flex;align-items:center;gap:10px;
  color:var(--muted);
  font-size:12px;
  flex-shrink:0;
}
.meta span{opacity:.9}
.arrow{color:var(--muted); opacity:.7}
.fab{
  position:fixed; right:16px; bottom:18px;
  display:flex; gap:10px;
  z-index:20;
}
.fab .btn{border-radius:18px; padding:12px 14px}
#editorView{
  position:fixed; inset:0;
  background:var(--bg);
  display:none;
  flex-direction:column;
  z-index:50;
}
#editorTop{
  position:sticky; top:0;
  padding:14px;
  border-bottom:1px solid var(--line);
  background:linear-gradient(to bottom, rgba(32,33,36,.98), rgba(32,33,36,.78));
  backdrop-filter: blur(10px);
}
#editorTop .small{color:var(--muted); font-size:12px}
#titleInput{
  width:100%;
  margin-top:10px;
  border:1px solid var(--line);
  background:rgba(255,255,255,.03);
  color:var(--text);
  border-radius:14px;
  padding:12px 12px;
  font-size:15px;
  outline:none;
  font-weight:700;
}
#bodyInput{
  flex:1;
  width:100%;
  border:0;
  outline:none;
  resize:none;
  background:transparent;
  color:var(--text);
  padding:14px;
  font-size:15px;
  line-height:1.7;
}
.spacer{height:8px}
.hint{color:var(--muted); font-size:12px}
.tag{
  display:inline-block;
  padding:4px 10px;
  border-radius:10px;
  font-size:11px;
  font-weight:650;
  border:1px solid var(--line);
  background:rgba(255,255,255,.04);
  color:var(--muted);
  user-select:none;
  cursor:pointer;
}

.tag.active{
  border-color:var(--gold);
  background:rgba(252,211,77,.15);
  color:var(--gold);
}
.tag.selected{
  border-color:var(--gold);
  background:rgba(252,211,77,.15);
  color:var(--gold);
}

#tagSelector{
  display:flex;
  flex-wrap:wrap;
  gap:6px;
  margin:14px 0 10px;
}

#customDialog{
  position:fixed; inset:0;
  background:rgba(0,0,0,.7);
  display:none;
  align-items:center;
  justify-content:center;
  z-index:100;
}
#dialogBox{
  background:var(--panel);
  border:1px solid var(--line);
  border-radius:var(--radius);
  padding:20px;
  max-width:90vw;
  width:340px;
}
#dialogTitle{
  font-size:16px;
  font-weight:700;
  margin-bottom:12px;
  color:var(--text);
}
#dialogMessage{
  font-size:14px;
  color:var(--muted);
  margin-bottom:20px;
  line-height:1.5;
}
#dialogButtons{
  display:flex;
  gap:10px;
  justify-content:flex-end;
}

.btn:disabled{
  opacity:0;
  pointer-events:none;
}
