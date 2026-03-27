export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = decodeURIComponent(url.pathname.slice(1)); // 文件名

    // 返回前端页面
    if (request.method === "GET" && !path) {
      return new Response(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>小配置网盘</title>
<style>
body { font-size: 22px; padding: 20px; font-family: sans-serif; }
button { font-size: 20px; margin: 5px; padding: 10px; }
input { font-size: 20px; margin: 5px 0; }
ul { font-size: 20px; padding-left: 20px; }
.progress { width: 100%; background: #ddd; height: 20px; border-radius: 5px; margin-top: 10px; }
.progress-bar { height: 100%; width: 0%; background: #4caf50; border-radius: 5px; text-align: center; color: white; }
.msg { font-size: 20px; margin-top: 10px; }
</style>
</head>
<body>
<h2>📦 小配置网盘</h2>
<input type="file" id="file">
<button onclick="upload()">上传</button>
<div class="progress"><div class="progress-bar" id="progress-bar">0%</div></div>
<div class="msg" id="msg"></div>
<h3>文件列表</h3>
<ul id="list"></ul>

<script>
const API = location.origin;

async function upload() {
  const f = document.getElementById("file").files[0];
  if(!f) return alert("请选择文件");
  if(f.size > 25*1024*1024) return alert("文件不能超过 25MB");

  const bar = document.getElementById("progress-bar");
  const msg = document.getElementById("msg");

  bar.style.width = "0%";
  bar.innerText = "0%";
  msg.innerText = "";

  const reader = new FileReader();
  reader.onload = async () => {
    const arrayBuffer = reader.result;
    const chunk = new Uint8Array(arrayBuffer);
    try {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", API + "/" + encodeURIComponent(f.name));
      xhr.upload.onprogress = (e) => {
        if(e.lengthComputable){
          const p = Math.floor((e.loaded/e.total)*100);
          bar.style.width = p + "%";
          bar.innerText = p + "%";
        }
      };
      xhr.onload = () => {
        if(xhr.status === 200){
          bar.style.width = "100%";
          bar.innerText = "完成";
          msg.innerText = "上传成功 ✅";
        } else {
          bar.style.width = "0%";
          bar.innerText = "0%";
          msg.innerText = "上传失败 ❌";
        }
        setTimeout(() => { bar.style.width="0%"; bar.innerText="0%"; msg.innerText=""; }, 2000);
        load();
      };
      xhr.onerror = () => {
        bar.style.width = "0%";
        bar.innerText = "0%";
        msg.innerText = "上传失败 ❌";
      };
      xhr.send(chunk);
    } catch(e){
      bar.style.width = "0%";
      bar.innerText = "0%";
      msg.innerText = "上传失败 ❌";
    }
  };
  reader.readAsArrayBuffer(f);
}

async function del(name){
  if(!confirm("确定删除 "+name+" ?")) return;
  try{
    const res = await fetch(API+"/"+encodeURIComponent(name), { method:"DELETE" });
    if(res.ok) alert("删除成功 ✅"); else alert("删除失败 ❌");
  } catch(e){ alert("删除失败 ❌"); }
  load();
}

async function load(){
  try{
    const res = await fetch(API+"/list");
    const files = await res.json();
    const ul = document.getElementById("list");
    ul.innerHTML = "";
    files.forEach(f=>{
      const li = document.createElement("li");
      li.innerHTML = f + ' <button onclick="download(\''+f+'\')">下载</button> <button onclick="del(\''+f+'\')">删除</button>';
      ul.appendChild(li);
    });
  } catch(e){ console.log(e); }
}

function download(name){
  const link = document.createElement("a");
  link.href = API+"/"+encodeURIComponent(name);
  link.download = name;
  link.click();
}

load();
</script>
</body>
</html>`, {headers: {"Content-Type":"text/html"}});
    }

    // PUT 上传文件（二进制）
    if(request.method === "PUT"){
      const arrayBuffer = await request.arrayBuffer();
      const chunk = new Uint8Array(arrayBuffer);
      const base64 = btoa(String.fromCharCode(...chunk));
      await env.MY_KV.put(path, base64);
      return new Response("OK");
    }

    // DELETE 文件
    if(request.method === "DELETE"){
      await env.MY_KV.delete(path);
      return new Response("Deleted");
    }

    // GET 文件
    if(request.method === "GET" && path){
      const val = await env.MY_KV.get(path);
      if(!val) return new Response("Not found", {status:404});
      return new Response(Uint8Array.from(atob(val), c=>c.charCodeAt(0)));
    }

    // 文件列表
    if(request.method === "GET" && url.pathname==="/list"){
      const list = await env.MY_KV.list();
      return new Response(JSON.stringify(list.keys.map(k=>k.name)));
    }

    return new Response("OK");
  }
}
