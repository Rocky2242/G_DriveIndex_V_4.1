var authConfig = {
    "siteName": "The Larkens", // Site Name
    "version" : "2.4", // version
    "theme" : "material", // material  classic
    "main_color": "lime",
    "accent_color": "light-blue",
    "client_id": "202264815644.apps.googleusercontent.com",
    "client_secret": "X4Z3ca8xfWDb1Voo-F9a7ZxJ",
    "refresh_token": "", // Authorization token
    "root": "" // Root directory ID
  };

  /**
 * web ui config
 */
const uiConfig = {
	"theme": "bhadoo_bootstrap", // Change doesn't works
	"dark_mode": true, // switch between light or dark themes
	"version": "2.0.1", // don't touch this one. get latest code using generator at https://github.com/ParveenBhadooOfficial/Bhadoo-Drive-Index
	"logo_image": false, // true if you're using image link in next option.
	"logo_link_name": "RedZone", // if logo is true then link otherwise just text for name
	"contact_link": "https://t.me/redzonefun", // Link to Contact Button on Menu
	"copyright_year": "2021", // year of copyright, can be anything like 2015 - 2020 or just 2020
	"company_name": "RedZone", // Name next to copyright
	"company_link": "https://t.me/redzonefun", // link of copyright name
	"credit": false, // Set this to true to give us credit
};

  var gd;
  var html = `
  <html>
  <head>
      <meta charset="utf-8">
      <title>Not Allowed</title>
  </head>
  </html>
  `;
  
  addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
  });
  
  function unauthorized() {
    return new Response('401 NOT AUTHORIZED', {
      headers: {
        'WWW-Authenticate': 'Basic realm="Access to GoIndex Drive", charset="UTF-8"',
        'Access-Control-Allow-Origin': '*'
      },
      status: 401
    });
  }
  
  function parseBasicAuth(auth) {
    try {
      return atob(auth.split(' ').pop()).split(':');
    } catch (e) {
      return [];
    }
  }
  
  function doBasicAuth(request) {
    const auth = request.headers.get('Authorization');
  
    if (!auth || !/^Basic [A-Za-z0-9._~+/-]+=*$/i.test(auth)) {
      return false;
    }
  
    const [user, pass] = parseBasicAuth(auth);
    return user === authConfig.user && pass === authConfig.pass;
  }
  
  /**
  * Fetch and log a request
  * @param {Request} request
  */
  async function handleRequest(request) {
    if(gd == undefined){
      gd = new googleDrive(authConfig);
    }
  
    if (authConfig.basic_auth && !doBasicAuth(request)) {
      return unauthorized();
    }
  
    let url = new URL(request.url);
  
    if (request.method == 'GET'){
      return apiRequest(request);
    }
  
    let path = url.pathname;
    let action = url.searchParams.get('a');
    console.log("action is ",action);
    if(path.substr(-1) == '/' || action != null){
      return new Response(html,{status:200,headers:{'Content-Type':'text/html; charset=utf-8'}});
      //return new Response(html,{status:200,headers:{'Content-Type':'application/json'}});
    }else{
      let file = await gd.file(path);
      let range = request.headers.get('Range');
      return gd.down(file.id, range);
    }
  }
  
  
  async function apiRequest(request) {
    let url = new URL(request.url);
    let path = url.pathname;
    //console.log(path);
    let option = {status:200,headers:{'Content-Type':'application/json; charset=utf-8'}}
    
    if(path.substr(-1) == '/'){
      let list = await gd.list(path);
      //console.log(list);
      return new Response(JSON.stringify(list.files),option);
    }else{
      let file = await gd.file(path);
      let range = request.headers.get('Range');
      return new Response(JSON.stringify(file));
    }
  }
  
  async function apiSearchRequest(q) {
    let option = {status:200,headers:{'Access-Control-Allow-Origin':'*'}}
    let notfound = []
    let list = await gd.search(q);
    if(list.length == 0){
        return new Response(JSON.stringify(notfound),option);
    }else{
        return new Response(JSON.stringify(list),option);
    }
  }
  
  class googleDrive {
    constructor(authConfig) {
        this.authConfig = authConfig;
        this.paths = [];
        this.files = [];
        this.paths["/"] = authConfig.root;
        this.accessToken();
    }
    
    async down(id, range=''){
      let url = `https://www.googleapis.com/drive/v3/files/${id}?alt=media`;
      let requestOption = await this.requestOption();
      requestOption.headers['Range'] = range;
      return await fetch(url, requestOption);
    }
  
    async file(path){
      if(typeof this.files[path] == 'undefined'){
        this.files[path]  = await this._file(path);
      }
      return this.files[path] ;
    }
  
    async _file(path){
      let arr = path.split('/');
      let name = arr.pop();
      name = decodeURIComponent(name).replace(/\'/g, "\'");
      let dir = arr.join('/')+'/';
      console.log(name, dir);
      let parent = await this.findPathId(dir);
      console.log(parent);
      let url = 'https://www.googleapis.com/drive/v3/files';
      let params = {'includeItemsFromAllDrives':true,'supportsAllDrives':true};
      params.q = `'${parent}' in parents and name = '${name}' andtrashed = false`;
      params.fields = 
      "files(id, name, mimeType, size ,createdTime, modifiedTime, iconLink, thumbnailLink)";
      url += '?'+this.enQuery(params);
      let requestOption = await this.requestOption();
      let response = await fetch(url, requestOption);
      let obj = await response.json();
      console.log(obj);
      return obj.files[0];
    }
  
    // cari langsung ke gd berdasarkan root id sekarang
    async search(query){
      let url = 'https://www.googleapis.com/drive/v3/files';
      this.files = [];
      if(authConfig.root.length>20){
          return this.files;
      }
      let params;
      if(authConfig.root=="root"){
          params = {'corpus':'user','includeItemsFromAllDrives':false,'supportsAllDrives':false};
          params.q = `name contains '${query}' and trashed = false`;
      }else{
          params = {'corpora':'drive', 'driveId': authConfig.root, 'includeItemsFromAllDrives':true,'supportsAllDrives':true};
          params.q = `name contains '${query}' and trashed = false`;
      }
      params.fields = "files(id, name, mimeType, size ,createdTime, modifiedTime, iconLink, thumbnailLink)";
      url += '?'+this.enQuery(params);
      let requestOption = await this.requestOption();
      let response = await fetch(url, requestOption);
      let obj = await response.json();
      for (let i=0; i<obj.files.length; i+=1) {
          this.files.push(obj.files[i]);
      }
      return this.files;
    }
  
    // Cache via reqeust cache
    async list(path){
      if (gd.cache == undefined) {
        gd.cache = {};
      }
  
      if (gd.cache[path]) {
        //console.log("cached storage",gd.cache[path]);
        return gd.cache[path];
      }
  
      let id = await this.findPathId(path);
      var obj = await this._ls(id);
      if (obj.files) {
            gd.cache[path] = obj;
      }
  
      return obj
    }
  
    async _ls(parent){
      console.log("_ls",parent);
  
      if(parent==undefined){
        return null;
      }
      const files = [];
      let pageToken;
      let obj;
      let params = {'includeItemsFromAllDrives':true,'supportsAllDrives':true};
      params.q = `'${parent}' in parents and trashed = false`;
      params.orderBy= 'folder,name,modifiedTime desc';
      params.fields = 
      "nextPageToken, files(id, name, mimeType, size , modifiedTime, thumbnailLink)";
      params.pageSize = 1000;
  
      do {
        if (pageToken) {
            params.pageToken = pageToken;
        }
        let url = 'https://www.googleapis.com/drive/v3/files';
        url += '?'+this.enQuery(params);
        let requestOption = await this.requestOption();
        let response = await fetch(url, requestOption);
        obj = await response.json();
        files.push(...obj.files);
        pageToken = obj.nextPageToken;
      } while (pageToken);
  
      obj.files = files;
      console.log("_ls fetched",obj);
      return obj;
    }
  
    async findPathId(path){
      let c_path = '/';
      let c_id = this.paths[c_path];
  
      let arr = path.trim('/').split('/');
      for(let name of arr){
        c_path += name+'/';
  
        if(typeof this.paths[c_path] == 'undefined'){
          let id = await this._findDirId(c_id, name);
          this.paths[c_path] = id;
        }
  
        c_id = this.paths[c_path];
        if(c_id == undefined || c_id == null){
          break;
        }
      }
      console.log(this.paths);
      return this.paths[path];
    }
  
    async _findDirId(parent, name){
      name = decodeURIComponent(name).replace(/\'/g, "\'");
      
      console.log("_findDirId",parent,name);
  
      if(parent==undefined){
        return null;
      }
  
      let url = 'https://www.googleapis.com/drive/v3/files';
      let params = {includeItemsFromAllDrives:true,supportsAllDrives:true};
      params.q = `'${parent}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '${name}'  and trashed = false`;
      params.fields = "nextPageToken, files(id, name, mimeType)";
      url += '?'+this.enQuery(params);
      let requestOption = await this.requestOption();
      let response = await fetch(url, requestOption);
      let obj = await response.json();
      if(obj.files[0] == undefined){
        return null;
      }
      return obj.files[0].id;
    }
  
    async accessToken(){
      console.log("accessToken");
      if(this.authConfig.expires == undefined  ||this.authConfig.expires< Date.now()){
        const obj = await this.fetchAccessToken();
        if(obj.access_token != undefined){
          this.authConfig.accessToken = obj.access_token;
          this.authConfig.expires = Date.now()+3500*1000;
        }
      }
      return this.authConfig.accessToken;
    }
  
    async fetchAccessToken() {
        console.log("fetchAccessToken");
        const url = "https://www.googleapis.com/oauth2/v4/token";
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        const post_data = {
            'client_id': this.authConfig.client_id,
            'client_secret': this.authConfig.client_secret,
            'refresh_token': this.authConfig.refresh_token,
            'grant_type': 'refresh_token'
        }
  
        let requestOption = {
            'method': 'POST',
            'headers': headers,
            'body': this.enQuery(post_data)
        };
  
        const response = await fetch(url, requestOption);
        return await response.json();
    }
  
    async fetch200(url, requestOption) {
        let response;
        for (let i = 0; i < 3; i++) {
            response = await fetch(url, requestOption);
            console.log(response.status);
            if (response.status != 403) {
                break;
            }
            await this.sleep(800 * (i + 1));
        }
        return response;
    }
  
    async requestOption(headers={},method='GET'){
      const accessToken = await this.accessToken();
      headers['authorization'] = 'Bearer '+ accessToken;
      return {'method': method, 'headers':headers};
    }
  
    enQuery(data) {
        const ret = [];
        for (let d in data) {
            ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(data[d]));
        }
        return ret.join('&');
    }
  
    sleep(ms) {
        return new Promise(function (resolve, reject) {
            let i = 0;
            setTimeout(function () {
                console.log('sleep' + ms);
                i++;
                if (i >= 2) reject(new Error('i>=2'));
                else resolve(i);
            }, ms);
        })
    }
  }
  
  String.prototype.trim = function (char) {
    if (char) {
        return this.replace(new RegExp('^\\'+char+'+|\\'+char+'+$', 'g'), '');
    }
    return this.replace(/^\s+|\s+$/g, '');
  };