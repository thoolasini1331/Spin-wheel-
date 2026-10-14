:root{
  --deep-green:#063D22;
  --gold:#D4A72C;
  --cream:#F3E4C5;
  --offwhite:#F7F5EF;
  --bg: #062b1a;
  --glass: rgba(255,255,255,0.06);
}

*{box-sizing:border-box}
html,body,#app{height:100%}
body{
  margin:0;
  font-family: "Times New Roman", Times, serif;
  background: linear-gradient(180deg, rgba(6,29,16,1) 0%, rgba(6,29,16,0.9) 30%, rgba(4,18,10,1) 100%);
  color:var(--offwhite);
  -webkit-font-smoothing:antialiased;
  -moz-osx-font-smoothing:grayscale;
  padding-bottom:32px;
}

.hero{
  display:flex;
  justify-content:space-between;
  align-items:center;
  padding:28px 36px;
  border-bottom: 1px solid rgba(212,167,44,0.06);
  position:relative;
}
.hero-inner{max-width:70%}
.title{
  margin:0;
  font-size:28px;
  font-weight:bold;
  font-style:italic;
  color:var(--offwhite);
  letter-spacing:1px;
}
.subtitle{
  margin:6px 0 0;
  color:var(--cream);
  font-style:italic;
  opacity:0.95;
}

.music-toggle{
  width:44px;
  height:44px;
  background:linear-gradient(145deg,#ffffff10,#00000010);
  border-radius:50%;
  display:flex;
  align-items:center;
  justify-content:center;
  color:var(--gold);
  font-weight:bold;
  font-size:18px;
  cursor:pointer;
  border:2px solid rgba(212,167,44,0.12);
  box-shadow:0 4px 18px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03);
}

.container{
  display:flex;
  gap:20px;
  padding:28px;
  align-items:flex-start;
}

/* Left */
.left-panel{flex:1;max-width:900px}
.wheel-wrap{
  position:relative;
  background: radial-gradient(1200px 300px at 50% 80%, rgba(0,0,0,0.35), transparent 20%), linear-gradient(180deg, rgba(7,45,27,0.75), rgba(2,10,8,0.6));
  padding:28px;
  border-radius:14px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.6);
}

/* Canvas sizing */
#wheelCanvas{ width:100%; height:600px; display:block; background:transparent; border-radius:10px; }

/* Pointer */
#pointer{ position:absolute; left:50%; top:6px; transform:translateX(-50%); width:80px; height:80px; pointer-events:none; z-index:40; filter:drop-shadow(0 6px 8px rgba(0,0,0,0.6)); }
.pointer-svg{ width:100%; height:100%; }

/* Buttons */
.btn{
  font-family:"Times New Roman", Times, serif;
  font-weight:bold;
  font-size:16px;
  padding:10px 18px;
  background:linear-gradient(180deg,var(--gold), #b78e1f);
  color:var(--deep-green);
  border:none;
  border-radius:8px;
  cursor:pointer;
  margin:8px;
}
.btn.small{ padding:6px 10px; font-size:14px; border-radius:6px; }
.btn.reset{ background:linear-gradient(180deg,#ffffff10,#00000010); color:var(--offwhite); border:1px solid rgba(255,255,255,0.04) }

/* Spin & Spin Again toggling visibility */
#spinAgainBtn{ display:none; }

/* Controls */
.controls{ display:flex; justify-content:space-between; align-items:center; margin-top:14px; }
.audio-uploads label{ display:block; margin-bottom:8px; color:var(--cream); font-size:13px}
.audio-uploads input[type="file"]{ display:block; margin-top:6px; color:#fff; }
.sound-toggle{ margin-left:8px; }

/* Right panel */
.right-panel{
  width:340px;
  background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.08));
  padding:16px;
  border-radius:12px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.45);
}
.right-panel h2{ margin:8px 0 10px; font-style:italic; font-weight:bold }
#entryForm input{ width:100%; padding:8px 10px; margin-bottom:8px; border-radius:6px; border:1px solid rgba(255,255,255,0.06); background:rgba(255,255,255,0.02); color:var(--offwhite); font-family:"Times New Roman", Times, serif; font-style:italic }
.form-row{ display:flex; gap:8px }
.entries{ max-height:260px; overflow:auto; padding:6px; border-radius:6px; border:1px dashed rgba(255,255,255,0.03) }
.entry-item{ padding:8px; display:flex; justify-content:space-between; gap:8px; align-items:center; border-bottom:1px solid rgba(255,255,255,0.02) }
.entry-meta{ flex:1; }
.entry-meta .name{ font-weight:bold; font-style:italic }
.entry-meta .url{ font-size:12px; opacity:0.85 }
.entry-actions button{ margin-left:6px; }

/* History */
.history-list{ max-height:180px; overflow:auto; padding:8px; border-radius:6px; border:1px dashed rgba(255,255,255,0.03); }
.history-item{ padding:6px; font-size:13px; border-bottom:1px solid rgba(255,255,255,0.02); }

/* Modal winner */
.modal{
  position:fixed; inset:0; display:flex; align-items:center; justify-content:center;
  background:rgba(0,0,0,0.45); z-index:200; visibility:hidden; opacity:0; transition:opacity .25s ease;
}
.modal[aria-hidden="false"]{ visibility:visible; opacity:1; }
.modal-content{
  min-width:320px; max-width:700px; padding:28px; border-radius:12px; text-align:center;
  background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.06));
  box-shadow: 0 10px 40px rgba(0,0,0,0.6);
  border: 1px solid rgba(212,167,44,0.08);
}
.winner-title{ font-size:32px; font-weight:bold; font-style:italic; color:var(--gold); text-shadow:0 2px 12px rgba(212,167,44,0.12) }
.winner-name{ font-size:24px; font-weight:bold; font-style:italic; color:var(--offwhite); margin:12px 0; }

/* Effects canvas */
.effects-canvas{ position:fixed; left:0; top:0; width:100vw; height:100vh; pointer-events:none; z-index:150; }

/* Footer */
.footer{ text-align:center; margin-top:18px; color:rgba(255,255,255,0.5) }

/* Responsive */
@media (max-width:980px){
  .container{ flex-direction:column; padding:16px }
  .right-panel{ width:100%; order:2; margin-top:16px }
  #wheelCanvas{ height:520px }
}
@media (max-width:520px){
  #wheelCanvas{ height:420px }
  .title{ font-size:20px }
  .winner-title{ font-size:22px }
  .winner-name{ font-size:18px }
}
